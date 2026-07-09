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
14	contact_submissions	inquiry_type	character varying	YES	'sales'::character varying
15	job_applications	id	integer	NO	nextval('job_applications_id_seq'::regclass)
16	job_applications	job_id	integer	YES	
17	job_applications	full_name	character varying	NO	
18	job_applications	email	character varying	NO	
19	job_applications	phone	character varying	YES	
20	job_applications	cover_letter	text	YES	
21	job_applications	resume_url	text	YES	
22	job_applications	created_at	timestamp with time zone	YES	now()
23	jobs	id	integer	NO	nextval('jobs_id_seq'::regclass)
24	jobs	title	character varying	NO	
25	jobs	description	text	YES	
26	jobs	created_at	timestamp without time zone	YES	now()
27	our_company	id	integer	NO	nextval('our_company_id_seq'::regclass)
28	our_company	cover_pic	text	YES	
29	our_company	description	text	YES	
30	our_company	updated_at	timestamp without time zone	YES	now()
31	our_company_sections	id	integer	NO	nextval('our_company_sections_id_seq'::regclass)
32	our_company_sections	our_company_id	integer	YES	
33	our_company_sections	title	character varying	YES	
34	our_company_sections	description	text	YES	
35	our_company_sections	image_url	text	YES	
36	our_company_sections	created_at	timestamp without time zone	YES	now()
37	products_services	id	integer	NO	nextval('products_services_id_seq'::regclass)
38	products_services	image_url	text	YES	
39	products_services	title	character varying	NO	
40	products_services	description	text	YES	
41	products_services	video_url	text	YES	
42	products_services	created_at	timestamp without time zone	YES	now()
43	project_images	id	integer	NO	nextval('project_images_id_seq'::regclass)
44	project_images	project_id	integer	NO	
45	project_images	image_url	text	NO	
46	project_images	caption	text	YES	
47	project_images	display_order	integer	YES	0
48	project_images	created_at	timestamp with time zone	YES	now()
49	projects	id	integer	NO	nextval('projects_id_seq'::regclass)
50	projects	image_url	text	YES	
51	projects	title	character varying	NO	
52	projects	description	text	YES	
53	projects	video_url	text	YES	
54	projects	created_at	timestamp without time zone	YES	now()
55	projects	sort_order	integer	YES	0
56	projects	project_type	character varying	YES	
57	projects	constructed_date	date	YES	
58	projects	location	character varying	YES	
59	projects	client_name	character varying	YES	
