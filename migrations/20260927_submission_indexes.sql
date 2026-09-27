CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at
  ON contact_submissions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_applications_created_at
  ON job_applications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_applications_job_id
  ON job_applications (job_id);
