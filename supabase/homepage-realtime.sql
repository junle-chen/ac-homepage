-- Supabase setup for HomePage live memos, paper stars, and note archives.
-- Owner account: junle-chen / 108796659.

create extension if not exists pgcrypto;

create or replace function public.is_homepage_owner()
returns boolean
language sql
stable
as $$
	select
		auth.role() = 'authenticated'
		and (
			coalesce(auth.jwt() -> 'user_metadata' ->> 'provider_id', '') = '108796659'
			or lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'user_name', '')) = lower('junle-chen')
			or lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'preferred_username', '')) = lower('junle-chen')
			or lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'nickname', '')) = lower('junle-chen')
		);
$$;

create table if not exists public.site_memos (
	id uuid primary key default gen_random_uuid(),
	title text not null default 'Memo',
	content text not null default '',
	category text not null default 'live',
	priority text not null default 'normal',
	source text not null default 'live',
	created_by uuid references auth.users(id) default auth.uid(),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	deleted_at timestamptz
);

create table if not exists public.site_reactions (
	id uuid primary key default gen_random_uuid(),
	item_type text not null check (item_type in ('daily_paper', 'zotero_paper', 'note_archive')),
	item_key text not null,
	active boolean not null default true,
	created_by uuid references auth.users(id) default auth.uid(),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (item_type, item_key)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = now();
	return new;
end;
$$;

drop trigger if exists set_site_memos_updated_at on public.site_memos;
create trigger set_site_memos_updated_at
	before update on public.site_memos
	for each row execute function public.set_updated_at();

drop trigger if exists set_site_reactions_updated_at on public.site_reactions;
create trigger set_site_reactions_updated_at
	before update on public.site_reactions
	for each row execute function public.set_updated_at();

alter table public.site_memos enable row level security;
alter table public.site_reactions enable row level security;

drop policy if exists "Public read live memos" on public.site_memos;
create policy "Public read live memos"
	on public.site_memos
	for select
	using (deleted_at is null);

drop policy if exists "Owner insert memos" on public.site_memos;
create policy "Owner insert memos"
	on public.site_memos
	for insert
	with check (public.is_homepage_owner());

drop policy if exists "Owner update memos" on public.site_memos;
create policy "Owner update memos"
	on public.site_memos
	for update
	using (public.is_homepage_owner())
	with check (public.is_homepage_owner());

drop policy if exists "Owner delete memos" on public.site_memos;
create policy "Owner delete memos"
	on public.site_memos
	for delete
	using (public.is_homepage_owner());

drop policy if exists "Public read reactions" on public.site_reactions;
create policy "Public read reactions"
	on public.site_reactions
	for select
	using (true);

drop policy if exists "Owner insert reactions" on public.site_reactions;
create policy "Owner insert reactions"
	on public.site_reactions
	for insert
	with check (public.is_homepage_owner());

drop policy if exists "Owner update reactions" on public.site_reactions;
create policy "Owner update reactions"
	on public.site_reactions
	for update
	using (public.is_homepage_owner())
	with check (public.is_homepage_owner());

drop policy if exists "Owner delete reactions" on public.site_reactions;
create policy "Owner delete reactions"
	on public.site_reactions
	for delete
	using (public.is_homepage_owner());

alter table public.site_memos replica identity full;
alter table public.site_reactions replica identity full;

do $$
begin
	if exists (
		select 1
		from pg_publication
		where pubname = 'supabase_realtime'
	)
	and not exists (
		select 1
		from pg_publication_tables
		where pubname = 'supabase_realtime'
			and schemaname = 'public'
			and tablename = 'site_memos'
	) then
		alter publication supabase_realtime add table public.site_memos;
	end if;
end;
$$;

do $$
begin
	if exists (
		select 1
		from pg_publication
		where pubname = 'supabase_realtime'
	)
	and not exists (
		select 1
		from pg_publication_tables
		where pubname = 'supabase_realtime'
			and schemaname = 'public'
			and tablename = 'site_reactions'
	) then
		alter publication supabase_realtime add table public.site_reactions;
	end if;
end;
$$;
