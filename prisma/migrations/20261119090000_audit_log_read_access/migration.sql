CREATE INDEX "Log_createdAt_id_idx" ON "public"."Log"("createdAt", "id");

INSERT INTO "public"."Privilege" ("id", "name", "updatedAt")
VALUES ('d501f5b0-4f58-4f5b-895c-cb25d2352834', 'AUDIT_LOG:READ', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO UPDATE SET "deletedAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "public"."_RoleToPrivilege" ("A", "B")
SELECT privilege."id", role."id"
FROM "public"."Privilege" privilege
CROSS JOIN "public"."Role" role
WHERE privilege."name" = 'AUDIT_LOG:READ'
  AND role."name" IN ('admin', 'superadmin') AND role."deletedAt" IS NULL
ON CONFLICT DO NOTHING;
