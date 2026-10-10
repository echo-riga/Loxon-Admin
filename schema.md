table_name	column_name	data_type	is_nullable	column_default
1	clients	id	integer	NO	nextval('clients_id_seq'::regclass)
2	clients	image_url	text	YES
3	clients	title	character varying	NO
4	clients	description	text	YES
5	clients	link	text	YES
6	clients	created_at	timestamp without time zone	YES	now()
7	clients	entity_type	character varying	NO	'partner'::character varying
8	contact_submissions	id	integer	NO	nextval('contact_submissions_id_seq'::regclass)
9	contact_submissions	name	character varying	NO
10	contact_submissions	email	character varying	NO
11	contact_submissions	subject	character varying	YES
12	contact_submissions	message	text	NO
13	contact_submissions	created_at	timestamp with time zone	YES	now()
14	contact_submissions	notification_status	character varying	NO	'pending'::character varying
15	contact_submissions	notification_error	text	YES
16	job_applications	id	integer	NO	nextval('job_applications_id_seq'::regclass)
17	job_applications	job_id	integer	YES
18	job_applications	full_name	character varying	NO
19	job_applications	email	character varying	NO
20	job_applications	phone	character varying	YES
21	job_applications	cover_letter	text	YES
22	job_applications	resume_url	text	YES
23	job_applications	created_at	timestamp with time zone	YES	now()
24	job_applications	notification_status	character varying	NO	'pending'::character varying
25	job_applications	notification_error	text	YES
26	jobs	id	integer	NO	nextval('jobs_id_seq'::regclass)
27	jobs	title	character varying	NO
28	jobs	description	text	YES
29	jobs	created_at	timestamp without time zone	YES	now()
30	our_company	id	integer	NO	nextval('our_company_id_seq'::regclass)
31	our_company	cover_pic	text	YES
32	our_company	description	text	YES
33	our_company	updated_at	timestamp without time zone	YES	now()
34	our_company_sections	id	integer	NO	nextval('our_company_sections_id_seq'::regclass)
35	our_company_sections	our_company_id	integer	YES
36	our_company_sections	title	character varying	YES
37	our_company_sections	description	text	YES
38	our_company_sections	image_url	text	YES
39	our_company_sections	created_at	timestamp without time zone	YES	now()
40	products_services	id	integer	NO	nextval('products_services_id_seq'::regclass)
41	products_services	image_url	text	YES
42	products_services	title	character varying	NO
43	products_services	description	text	YES
44	products_services	video_url	text	YES
45	products_services	created_at	timestamp without time zone	YES	now()
46	project_images	id	integer	NO	nextval('project_images_id_seq'::regclass)
47	project_images	project_id	integer	NO
48	project_images	image_url	text	NO
49	project_images	caption	text	YES
50	project_images	display_order	integer	YES	0
51	project_images	created_at	timestamp with time zone	YES	now()
52	projects	id	integer	NO	nextval('projects_id_seq'::regclass)
53	projects	image_url	text	YES
54	projects	title	character varying	NO
55	projects	description	text	YES
56	projects	video_url	text	YES
57	projects	created_at	timestamp without time zone	YES	now()
58	projects	sort_order	integer	YES	0
59	projects	project_type	character varying	YES
60	projects	constructed_date	date	YES
61	projects	location	character varying	YES
62	projects	client_name	character varying	YES

## Content ordering migration (2026-10-10)

`migrations/20261010_content_order.sql` adds a nullable integer `sort_order`
column to `products_services`, `clients`, and `jobs`, and initializes existing
rows in their previous newest-first order. Apply this migration before using
the updated content routes. The projects schema remains unchanged.
