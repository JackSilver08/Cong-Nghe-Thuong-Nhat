import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

function loadLocalEnv() {
  if (!fs.existsSync('.env.local')) return;
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

async function resolveServiceKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!projectRef || !token) {
    throw new Error('Thiếu SUPABASE_SERVICE_ROLE_KEY hoặc SUPABASE_PROJECT_REF + SUPABASE_ACCESS_TOKEN.');
  }
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Không lấy được service key (${response.status}).`);
  const keys = await response.json();
  const service = keys.find((item) => item.name === 'service_role' || item.type === 'service_role');
  if (!service?.api_key) throw new Error('Project không trả về service_role key.');
  return service.api_key;
}

async function listFiles(storage, prefix = '') {
  const output = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await storage.list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    for (const item of data || []) {
      const itemPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id) output.push(itemPath);
      else output.push(...await listFiles(storage, itemPath));
    }
    if (!data || data.length < 100) break;
  }
  return output;
}

function publicUrl(storage, objectPath) {
  return storage.getPublicUrl(objectPath).data.publicUrl;
}

loadLocalEnv();
const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
if (!supabaseUrl) throw new Error('Thiếu SUPABASE_URL.');

const serviceKey = await resolveServiceKey();
const client = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucket = 'post-images';
const storage = client.storage.from(bucket);
const files = await listFiles(storage);
const legacy = files.filter((file) => !file.toLowerCase().endsWith('.webp'));
const replacements = new Map();
const uploaded = [];

for (const oldPath of legacy) {
  const { data, error } = await storage.download(oldPath);
  if (error) throw new Error(`Không tải được ${oldPath}: ${error.message}`);
  let encoded;
  try {
    encoded = await sharp(Buffer.from(await data.arrayBuffer()), { animated: false })
      .rotate()
      .webp({ quality: 82, effort: 5 })
      .toBuffer();
  } catch {
    console.warn(`Bỏ qua tệp không phải ảnh: ${oldPath}`);
    continue;
  }

  const newPath = oldPath.replace(/\.[^./]+$/, '') + '.webp';
  const { error: uploadError } = await storage.upload(newPath, encoded, {
    contentType: 'image/webp',
    cacheControl: '31536000',
    upsert: false,
  });
  if (uploadError && !/already exists|duplicate/i.test(uploadError.message)) {
    throw new Error(`Không upload được ${newPath}: ${uploadError.message}`);
  }
  replacements.set(publicUrl(storage, oldPath), publicUrl(storage, newPath));
  uploaded.push({ oldPath, newPath });
  console.log(`Đã chuyển: ${oldPath} -> ${newPath}`);
}

const { data: posts, error: postsError } = await client
  .from('posts')
  .select('id,image_url,content');
if (postsError) throw postsError;

for (const post of posts || []) {
  let imageUrl = post.image_url || '';
  let content = post.content || '';
  for (const [oldUrl, newUrl] of replacements) {
    imageUrl = imageUrl === oldUrl ? newUrl : imageUrl;
    content = content.split(oldUrl).join(newUrl);
  }
  if (imageUrl !== (post.image_url || '') || content !== (post.content || '')) {
    const { error } = await client
      .from('posts')
      .update({ image_url: imageUrl || null, content })
      .eq('id', post.id);
    if (error) throw new Error(`Không cập nhật được bài ${post.id}: ${error.message}`);
  }
}

if (uploaded.length) {
  const { error } = await storage.remove(uploaded.map((item) => item.oldPath));
  if (error) throw new Error(`Ảnh mới và bài viết đã cập nhật, nhưng chưa xóa được ảnh cũ: ${error.message}`);
}

console.log(`Hoàn tất: ${uploaded.length} ảnh Supabase đã chuyển sang WebP.`);
