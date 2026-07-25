-- Newsletter subscriptions now go through subscribe-newsletter, which validates
-- the address, suppresses duplicates and sends the welcome digest. Direct anon
-- inserts would bypass that workflow and allow list pollution.
drop policy if exists newsletter_insert_anon on public.newsletter_subscribers;
