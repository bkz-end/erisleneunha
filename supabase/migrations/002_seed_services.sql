-- Reset services list to match the provided price table.
-- Warning: deleting services will cascade and remove related bookings.

begin;

delete from services;

insert into services (name, price, duration, active) values
  ('Manicure', 20.00, 30, true),
  ('Pedicure', 20.00, 40, true),
  ('Esmaltação em gel', 50.00, 60, true),
  ('Banho de gel', 80.00, 75, true),
  ('Alongamento na fibra', 100.00, 150, true),
  ('Alongamento na tips', 90.00, 120, true),
  ('Encapsuladas par', 5.00, 15, true),
  ('Manutenção', 80.00, 90, true),
  ('Remoção', 40.00, 30, true);

commit;
