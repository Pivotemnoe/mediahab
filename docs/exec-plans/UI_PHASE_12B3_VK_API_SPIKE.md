# Phase 12B.3: official VK API read-only spike

Checked: 1 August 2026
Decision: keep VK in manual-export mode; do not add or enable an automatic connector in Phase 12B.3

## Confirmed official evidence

- The official VK Java SDK repository states that it is generated from VK API JSON Schema and currently references API schema version 5.199.
- Its official wall-photo example is a multi-step flow: obtain a wall upload server, upload the file, save the wall photo, construct an attachment id, then call `wall.post` with that attachment.
- The SDK documents separate user and community OAuth actors and requires an application id, secret, redirect URI, and an authorization flow.
- The official `VKCOM/vk-api-schema` issue tracker contains an unresolved 2026 report where text-only `wall.post` works with a community token but `photos.getWallUploadServer` returns group authorization error 27. This is evidence of a live authorization/media-upload ambiguity, not a stable contract to code around.

## Consequences

- Do not hardcode an unverified text limit into the VK capability.
- Do not treat text posting and media upload as one API call.
- Before an automatic connector, run a credentialed sandbox spike for the exact VK application and community: authorization actor, `wall.post`, image upload/save, video upload, link attachments, edit/delete, duplicate prevention, rate limits, and error mapping.
- That future spike transmits data and changes an external VK sandbox, so it requires separate owner approval and test credentials stored only in secret configuration.

## Sources

- Official VK Java SDK: https://github.com/VKCOM/vk-java-sdk
- Official VK API schema: https://github.com/VKCOM/vk-api-schema
- Open authorization/media-upload report in the official schema tracker: https://github.com/VKCOM/vk-api-schema/issues/242
