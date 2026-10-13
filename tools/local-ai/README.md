# Local AI helpers

These optional scripts keep generation on your computer. They create drafts
under `tools/local-ai/output/`, which Git ignores. Nothing is copied into a
live campaign automatically.

## Text and structured drafts with Ollama

1. Install [Ollama](https://ollama.com/) and download a model suited to your
   machine, for example `ollama pull qwen3:8b`.
2. Keep Ollama running.
3. Generate a draft:

```bash
python tools/local-ai/generate_campaign_draft.py \
  --model qwen3:8b \
  --language it \
  --brief "Una spedizione originale tra isole sospese e fari abbandonati"
```

The script uses Ollama's structured-output JSON schema. Review
`tools/local-ai/output/campaign-draft.json`, then manually adapt its content
to the working files documented in `docs/CONTENT-GUIDE.md`.

To turn a Campaign Scribe transcript into a bilingual session draft:

```bash
python tools/local-ai/summarize_transcript.py \
  discord-transcriber/transcripts/your-session.md \
  --model qwen3:8b
```

The result is written to `tools/local-ai/output/session-draft.json`. Compare
it with the transcript, correct speaker names and facts, then copy the reviewed
fields into a session JSON. The script tells the model not to invent missing
events, but a human review is still required.

Never ask a model to reproduce a published adventure or imitate a living
artist. Treat every generated fact as untrusted: review continuity, safety,
licenses and JSON before publication.

## Image prompt pack

```bash
python tools/local-ai/build_image_prompts.py
```

This turns the current draft into
`tools/local-ai/output/image-prompts.json`. Prompts ask for original
characters and environments without logos or copyrighted characters.

You may paste them into a local image tool such as
[ComfyUI](https://www.comfy.org/). Model checkpoints have their own licenses;
verify that yours permits the intended use and redistribution.

## Queue a prompt in ComfyUI (advanced)

In ComfyUI, build and test your workflow, then export it in API format. Locate
the node whose `inputs.text` contains the positive prompt:

```bash
python tools/local-ai/queue_comfyui.py \
  --workflow path/to/workflow-api.json \
  --prompt-node 6 \
  --prompt "original fantasy lighthouse at dusk, no text, no logos"
```

The default endpoint is `http://127.0.0.1:8188`. The script only queues the
workflow; ComfyUI controls models, seeds, output paths and image generation.
Do not commit workflow files that contain private paths or model-specific
metadata unless you intend to share them.
