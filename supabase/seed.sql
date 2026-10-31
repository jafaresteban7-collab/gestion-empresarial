-- =============================================================================
-- GestiónPro · Datos de prueba
-- 1) Catálogo de productos (mismos ids que usan los pedidos en tiempo real).
-- 2) Nombre, departamento y rol de los usuarios de prueba. Antes hay que crear
--    los usuarios en Authentication → Users → Add user (ver docs/SUPABASE.md).
-- =============================================================================

insert into public.products (id, sku, name, category, stock, price, supplier) values
  (1, 'HW-001', 'Portátil 14" i5', 'Hardware', 34, 849, 'Tecnodistrib S.L.'),
  (2, 'HW-002', 'Monitor 27" QHD', 'Hardware', 52, 289, 'Tecnodistrib S.L.'),
  (3, 'HW-003', 'Teclado mecánico', 'Hardware', 8, 79, 'Periféricos Iberia'),
  (4, 'HW-004', 'Ratón inalámbrico', 'Hardware', 120, 25, 'Periféricos Iberia'),
  (5, 'HW-005', 'Docking USB-C', 'Hardware', 6, 159, 'Tecnodistrib S.L.'),
  (6, 'HW-006', 'Auriculares con micrófono', 'Hardware', 64, 59, 'Audio Pro Sur'),
  (7, 'SW-001', 'Licencia ofimática anual', 'Software', 200, 99, 'SoftLic Europa'),
  (8, 'SW-002', 'Antivirus corporativo', 'Software', 150, 45, 'SoftLic Europa'),
  (9, 'SW-003', 'Suite de diseño', 'Software', 18, 599, 'Creativa Digital'),
  (10, 'SW-004', 'ERP módulo inventario', 'Software', 5, 1299, 'Gestiona Cloud'),
  (11, 'SW-005', 'Backup en la nube (1 TB)', 'Software', 75, 120, 'Gestiona Cloud'),
  (12, 'SW-006', 'IDE profesional', 'Software', 40, 249, 'Creativa Digital'),
  (13, 'MB-001', 'Silla ergonómica', 'Mobiliario', 22, 329, 'Oficina Total'),
  (14, 'MB-002', 'Mesa elevable', 'Mobiliario', 9, 549, 'Oficina Total'),
  (15, 'MB-003', 'Armario archivador', 'Mobiliario', 14, 189, 'Muebles Centro'),
  (16, 'MB-004', 'Lámpara LED de escritorio', 'Mobiliario', 48, 39, 'Muebles Centro'),
  (17, 'MB-005', 'Reposapiés regulable', 'Mobiliario', 3, 35, 'Oficina Total'),
  (18, 'MB-006', 'Pizarra blanca 120x90', 'Mobiliario', 11, 89, 'Muebles Centro'),
  (19, 'CO-001', 'Papel A4 (caja 5 paquetes)', 'Consumibles', 310, 22, 'Suministros Norte'),
  (20, 'CO-002', 'Tóner láser negro', 'Consumibles', 27, 68, 'Suministros Norte'),
  (21, 'CO-003', 'Bolígrafos (pack 50)', 'Consumibles', 95, 15, 'Suministros Norte'),
  (22, 'CO-004', 'Cuadernos A5 (pack 10)', 'Consumibles', 7, 18, 'Papelería Este'),
  (23, 'CO-005', 'Pilas AA (pack 24)', 'Consumibles', 60, 14, 'Papelería Este'),
  (24, 'CO-006', 'Etiquetas adhesivas', 'Consumibles', 140, 9, 'Papelería Este')
on conflict (id) do nothing;

-- El identity continúa a partir del último id insertado
select setval(pg_get_serial_sequence('public.products', 'id'), (select max(id) from public.products));

update public.profiles set name = 'Ana Admin',      department = 'Dirección', role = 'admin' where email = 'admin@empresa.test';
update public.profiles set name = 'Ulises Usuario', department = 'Ventas',    role = 'user'  where email = 'usuario@empresa.test';
update public.profiles set name = 'Lucía Analista', department = 'Compras',   role = 'user'  where email = 'analista@empresa.test';
