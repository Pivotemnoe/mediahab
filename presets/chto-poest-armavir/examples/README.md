# Example library import

Import 50–100 approved Telegram posts through the application UI or the import endpoint. Do not bundle private exports or tokens in the repository.

Recommended scoring signals:

- reactions;
- comments;
- shares/forwards;
- views;
- engagement rate;
- manual quality score;
- rubric match;
- style approval;
- rejected-pattern labels.

At generation time, retrieve only the most relevant approved examples (normally 3–8), not the complete library.

Use `schemas/example-import.schema.json` for import validation. The supplied `fixtures/telegram-donika.json` is a regression fixture and approved example.
