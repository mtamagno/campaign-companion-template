# Security

## Reporting a vulnerability

Please use GitHub's private security advisory feature instead of opening a
public issue. Include the affected version, reproduction steps and impact.

## Important limitations

Character passwords are checked in the browser. Static hosting necessarily
sends the underlying JSON to visitors, so this feature prevents casual
spoilers but is **not encryption or access control**. Do not place sensitive
personal data, credentials or valuable secrets in campaign files.

Keep Discord tokens in `discord-transcriber/.env`; the file is ignored by
Git. Rotate a token immediately if it is ever committed or posted.
