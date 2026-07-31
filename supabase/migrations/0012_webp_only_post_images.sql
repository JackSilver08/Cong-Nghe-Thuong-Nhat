-- New uploads are normalized to WebP by the admin before reaching Storage.
-- Restricting the bucket prevents legacy clients from adding heavy raster files.
update storage.buckets
set allowed_mime_types = array['image/webp']
where id = 'post-images';
