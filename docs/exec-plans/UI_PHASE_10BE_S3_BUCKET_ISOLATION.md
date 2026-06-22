# UI Phase 10be — S3 Bucket Isolation Prefix

## Objective

Add an explicit Media Hub object-key prefix for shared S3 buckets so a pilot can safely reuse a Timeweb bucket that also contains files for another project.

The current Media Hub key shape already scopes uploads by workspace:

```text
workspaces/{workspace_id}/media/{media_id}/{filename}
```

For a shared bucket, add a deployment-level prefix before the workspace segment:

```text
temichev-posthub/workspaces/{workspace_id}/media/{media_id}/{filename}
```

## Scope

- Add a backend setting `MEDIA_STORAGE_PREFIX`.
- Apply it when creating media upload object keys.
- Keep the default empty to avoid changing local/dev behavior unless configured.
- Set the pilot server env to `MEDIA_STORAGE_PREFIX=temichev-posthub`.
- Do not change bucket credentials or copy/move existing objects.

## Tests

- Unit/API test for presigned upload key generation with `MEDIA_STORAGE_PREFIX`.
- Existing validation:
  - `make validate-spec`
  - `git diff --check`

Broader local gates should be run if runtime code changes require them:

- `make typecheck`
- `make lint`
- `make test`
- `pnpm --filter @temichev/web build`

## Risks

- Existing media uploaded before the prefix change keeps its old `storage_key` in PostgreSQL and remains readable by that exact key.
- A malformed prefix with leading/trailing slashes could create inconsistent object paths. Mitigation: normalize the prefix before building keys.

## Rollback

Unset `MEDIA_STORAGE_PREFIX` and restart API/worker. New uploads would return to the previous `workspaces/...` key shape; existing database rows remain key-specific.

