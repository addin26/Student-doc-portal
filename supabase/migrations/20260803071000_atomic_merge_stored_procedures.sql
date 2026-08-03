/*
# Atomic Merge Stored Procedures & Intelligent Search Function

## Overview
1. `merge_universities(source_univ_id, target_univ_id)`:
   Re-assigns all departments, subjects, courses, profiles, and resources from a source university (e.g. custom user-added entry) to a target official university in an atomic database transaction. Then removes the source university.

2. `merge_courses(source_course_id, target_course_id)`:
   Re-assigns all resources linked to source_course_id to target_course_id, then deletes source_course_id.

3. `search_resources_intelligent`:
   Full-Text & Trigram fuzzy search function combining trigram similarity scores across resources, universities, and courses.
*/

-- 1. ATOMIC MERGE UNIVERSITIES PROCEDURE
CREATE OR REPLACE FUNCTION merge_universities(
  source_univ_id UUID,
  target_univ_id UUID
) RETURNS VOID AS $$
BEGIN
  IF source_univ_id = target_univ_id THEN
    RAISE EXCEPTION 'Source and target university cannot be identical.';
  END IF;

  -- Re-link departments
  UPDATE departments SET university_id = target_univ_id WHERE university_id = source_univ_id;

  -- Re-link subjects
  UPDATE subjects SET university_id = target_univ_id WHERE university_id = source_univ_id;

  -- Re-link courses
  UPDATE courses SET university_id = target_univ_id WHERE university_id = source_univ_id;

  -- Re-link user profiles
  UPDATE profiles SET university_id = target_univ_id WHERE university_id = source_univ_id;

  -- Re-link resources
  UPDATE resources SET university_id = target_univ_id WHERE university_id = source_univ_id;

  -- Recalculate department count for target university
  UPDATE universities
  SET departments_count = (SELECT COUNT(*) FROM departments WHERE university_id = target_univ_id)
  WHERE id = target_univ_id;

  -- Delete duplicate source university record
  DELETE FROM universities WHERE id = source_univ_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ATOMIC MERGE COURSES PROCEDURE
CREATE OR REPLACE FUNCTION merge_courses(
  source_course_id UUID,
  target_course_id UUID
) RETURNS VOID AS $$
BEGIN
  IF source_course_id = target_course_id THEN
    RAISE EXCEPTION 'Source and target course cannot be identical.';
  END IF;

  -- Re-link resources from source course to target course
  UPDATE resources SET course_id = target_course_id WHERE course_id = source_course_id;

  -- Delete duplicate source course record
  DELETE FROM courses WHERE id = source_course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. INTELLIGENT SEARCH STORED PROCEDURE
CREATE OR REPLACE FUNCTION search_resources_intelligent(
  query_text TEXT DEFAULT '',
  univ_id UUID DEFAULT NULL,
  crs_id UUID DEFAULT NULL,
  cat_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  university_id UUID,
  course_id UUID,
  category_id UUID,
  file_type TEXT,
  file_size TEXT,
  uploader_id UUID,
  rating NUMERIC,
  downloads INT,
  views INT,
  tags TEXT[],
  ai_summary TEXT,
  storage_key TEXT,
  created_at TIMESTAMPTZ,
  match_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.description,
    r.university_id,
    r.course_id,
    r.category_id,
    r.file_type,
    r.file_size,
    r.uploader_id,
    r.rating,
    r.downloads,
    r.views,
    r.tags,
    r.ai_summary,
    r.storage_key,
    r.created_at,
    CASE 
      WHEN query_text IS NULL OR query_text = '' THEN 1.0
      ELSE (
        similarity(COALESCE(r.title, ''), query_text) * 3.0 +
        similarity(COALESCE(r.description, ''), query_text) * 1.5 +
        similarity(COALESCE(c.code, ''), query_text) * 4.0 +
        similarity(COALESCE(c.title, ''), query_text) * 2.0 +
        similarity(COALESCE(u.name, ''), query_text) * 2.0
      )::FLOAT
    END AS match_score
  FROM resources r
  LEFT JOIN universities u ON r.university_id = u.id
  LEFT JOIN courses c ON r.course_id = c.id
  WHERE 
    (univ_id IS NULL OR r.university_id = univ_id)
    AND (crs_id IS NULL OR r.course_id = crs_id)
    AND (cat_id IS NULL OR r.category_id = cat_id)
    AND (
      query_text IS NULL 
      OR query_text = ''
      OR r.title ILIKE '%' || query_text || '%'
      OR r.description ILIKE '%' || query_text || '%'
      OR c.code ILIKE '%' || query_text || '%'
      OR c.title ILIKE '%' || query_text || '%'
      OR u.name ILIKE '%' || query_text || '%'
      OR query_text = ANY(r.tags)
    )
  ORDER BY match_score DESC, r.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;
