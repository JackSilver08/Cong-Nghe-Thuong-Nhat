import { supabase } from './supabase';

export interface Category {
  slug: string;
  label: string;
  description: string;
  displayOrder?: number;
  showInHeader?: boolean;
  isActive?: boolean;
}

// Ordered list used for the main navigation and category pages.
export const CATEGORIES: Category[] = [
  { slug: 'ai', label: 'AI', description: 'Trí tuệ nhân tạo, mô hình ngôn ngữ, ứng dụng AI' },
  { slug: 'thiet-bi', label: 'Thiết bị', description: 'Máy tính xách tay, điện thoại, phần cứng và thiết bị thông minh' },
  { slug: 'startup', label: 'Khởi nghiệp', description: 'Khởi nghiệp công nghệ, gọi vốn, mô hình mới' },
  { slug: 'an-ninh-mang', label: 'An ninh mạng', description: 'Bảo mật, mã độc, quyền riêng tư dữ liệu' },
  { slug: 'lap-trinh', label: 'Lập trình', description: 'Ngôn ngữ, framework, công cụ cho developer' },
  { slug: 'cloud', label: 'Điện toán đám mây', description: 'Điện toán đám mây, hạ tầng và vận hành phát triển' },
  { slug: 'danh-gia', label: 'Đánh giá', description: 'Trải nghiệm và đánh giá sản phẩm công nghệ' },
];

const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));
let categoryCache: { expiresAt: number; items: Category[] } | undefined;

export function categoryLabel(slug: string): string {
  return BY_SLUG.get(slug)?.label ?? slug;
}

export function getCategory(slug: string): Category | undefined {
  return BY_SLUG.get(slug);
}

/** Active categories from Supabase, with the checked-in list as a safe fallback. */
export async function getCategories(): Promise<Category[]> {
  if (categoryCache && categoryCache.expiresAt > Date.now()) {
    return categoryCache.items;
  }
  if (!supabase) return CATEGORIES;

  const { data, error } = await supabase
    .from('categories')
    .select('slug,label,description,display_order,show_in_header,is_active')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('label', { ascending: true });

  if (error || !data?.length) {
    if (error && error.code !== '42P01') {
      console.warn('Supabase categories unavailable:', error.message);
    }
    return CATEGORIES;
  }

  const items = data.map((row: any) => ({
    slug: String(row.slug),
    label: String(row.label),
    description: String(row.description || ''),
    displayOrder: Number(row.display_order || 0),
    showInHeader: Boolean(row.show_in_header),
    isActive: Boolean(row.is_active),
  }));
  categoryCache = { items, expiresAt: Date.now() + 60_000 };
  return items;
}

export function categoryLabelFrom(categories: Category[], slug: string): string {
  return categories.find((category) => category.slug === slug)?.label ?? categoryLabel(slug);
}
