SELECT rolname || E'\t' || rolcanlogin || E'\t' || rolsuper || E'\t' || rolbypassrls || E'\t' || rolcreatedb || E'\t' || rolcreaterole
FROM pg_roles
WHERE rolname = :'app_db_user';
