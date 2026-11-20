-- =============================================================================
-- Initial plan & feature catalogue. Prices are product assumptions and are
-- data, not code: platform admins can edit them (Stage 8 admin UI).
-- Re-runnable: upserts.
-- =============================================================================

insert into public.features (key, name, module, description) values
  ('qr_menu',          'QR digital menu',          'menu',      'Guests open the menu by scanning a table QR code'),
  ('menu_builder',     'Menu builder',             'menu',      'Categories, products, photos, allergens'),
  ('basic_analytics',  'Basic analytics',          'analytics', 'Revenue and order overview'),
  ('online_ordering',  'Online ordering',          'ordering',  'Dine-in and takeaway ordering from the guest menu'),
  ('pos',              'Point of sale',            'pos',       'Touchscreen POS, tables, shifts, cash'),
  ('kds',              'Kitchen display',          'kds',       'Kitchen order screens and stations'),
  ('payments',         'Payment integrations',     'payments',  'Online payments incl. iDEAL'),
  ('advanced_menu',    'Advanced menu',            'menu',      'Combos, schedules, happy hour, branch pricing'),
  ('menu_3d',          '3D food previews',         'menu',      'Interactive 3D dish viewer'),
  ('inventory',        'Inventory & purchasing',   'inventory', 'Stock, recipes, suppliers, purchase orders'),
  ('crm',              'CRM & loyalty',            'crm',       'Customer profiles, loyalty, vouchers, campaigns'),
  ('staff',            'Staff management',         'staff',     'Schedules, clocking, tasks, announcements'),
  ('advanced_reports', 'Advanced reports',         'analytics', 'VAT, food cost, staff and branch reports, exports'),
  ('multi_branch',     'Multiple branches',        'tenancy',   'Manage more than one location')
on conflict (key) do update
  set name = excluded.name, module = excluded.module, description = excluded.description;

insert into public.plans (id, name, description, price_cents, trial_days, limits, is_public, sort_order) values
  ('starter',      'Starter',      'A beautiful QR menu for a single location.',             2900, 14,
     '{"branches": 1, "staff_seats": 3}',  true, 10),
  ('professional', 'Professional', 'Ordering, POS and kitchen display for busy restaurants.', 6900, 14,
     '{"branches": 1, "staff_seats": 15}', true, 20),
  ('business',     'Business',     'Inventory, CRM, staff and multiple branches.',           12900, 14,
     '{"branches": 5, "staff_seats": 75}', true, 30),
  ('enterprise',   'Enterprise',   'Custom limits, onboarding and support.',                 null,  0,
     '{}',                                 true, 40)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, price_cents = excluded.price_cents,
      trial_days = excluded.trial_days, limits = excluded.limits, is_public = excluded.is_public,
      sort_order = excluded.sort_order;

-- Plans are cumulative: each tier includes everything below it.
with tiers(plan_id, feature_key) as (
  select p, f from unnest(array['starter','professional','business','enterprise']) p,
                   unnest(array['qr_menu','menu_builder','basic_analytics']) f
  union all
  select p, f from unnest(array['professional','business','enterprise']) p,
                   unnest(array['online_ordering','pos','kds','payments','advanced_menu','menu_3d']) f
  union all
  select p, f from unnest(array['business','enterprise']) p,
                   unnest(array['inventory','crm','staff','advanced_reports','multi_branch']) f
)
insert into public.plan_features (plan_id, feature_key)
select plan_id, feature_key from tiers
on conflict do nothing;
