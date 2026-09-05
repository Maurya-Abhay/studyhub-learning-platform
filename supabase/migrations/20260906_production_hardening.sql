-- Production hardening for an already-created StudyHub schema.
-- Run this AFTER the base schema. It is intentionally additive and does not drop data.

create index if not exists idx_topic_progress_user_topic on public.topic_progress(user_id, topic_id);
create index if not exists idx_topic_progress_user_last_studied on public.topic_progress(user_id, last_studied_at desc);
create index if not exists idx_enrollments_user_course on public.enrollments(user_id, course_id);
create index if not exists idx_test_attempts_user_test_submitted on public.test_attempts(user_id, test_id, submitted_at);
create index if not exists idx_test_answers_attempt_question on public.test_answers(attempt_id, question_id);
create index if not exists idx_dsa_submissions_user_problem on public.dsa_submissions(user_id, problem_id, created_at desc);
create index if not exists idx_certificates_user_course on public.certificates(user_id, course_id);
create unique index if not exists uq_active_test_attempt_per_user_test
  on public.test_attempts(user_id, test_id) where submitted_at is null;
create unique index if not exists uq_active_certificate_per_user_course
  on public.certificates(user_id, course_id) where revoked_at is null;
create unique index if not exists uq_certificate_code on public.certificates(certificate_code);

-- Prevent obviously invalid progress values at the database boundary.
alter table public.topic_progress drop constraint if exists topic_progress_progress_range;
alter table public.topic_progress add constraint topic_progress_progress_range check (progress >= 0 and progress <= 100);
