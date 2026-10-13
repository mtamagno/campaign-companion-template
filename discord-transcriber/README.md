# Campaign Scribe — trascrizioni Discord locali

Campaign Scribe entra nel canale vocale dell'utente che esegue `/trascrivi`,
separa l'audio per account Discord, trascrive il parlato italiano con
faster-whisper e aggiunge gli interventi a un file Markdown locale.

```text
- **21:34:08 — Alice:** Andiamo a parlare con la custode prima di entrare nella torre.
- **21:34:19 — Bruno:** Controllo se abbiamo ancora pozioni di cura.
```

Il nome del parlante è il nome visualizzato su Discord: non viene effettuato
riconoscimento biometrico della voce. I nomi dei partecipanti vengono passati
a Whisper come parole prioritarie per migliorare la resa dei nomi propri.
Decorazioni ed emoji Discord sono rimosse e la lista viene deduplicata.

## Privacy e dati locali

- Le trascrizioni vengono scritte esclusivamente in `transcripts/` sul computer
  che esegue il bot.
- Il testo trascritto non viene pubblicato nei canali Discord.
- Le risposte ai comandi sono messaggi Discord privati/effimeri.
- L'audio PCM viene mantenuto in memoria solo per il tempo necessario alla
  segmentazione e non viene salvato su disco.
- `.env`, ambiente virtuale, trascrizioni, log e PID sono esclusi da Git.

Avvisa sempre i partecipanti prima di iniziare e rispetta le regole del server
e la normativa applicabile.

## Funzionamento

```text
Discord voice
    └─ flusso PCM separato per utente
        └─ segmentazione per silenzio o durata massima
            └─ coda faster-whisper large-v3 / CUDA FP16
                └─ transcripts/<data>_<canale>_<server>.md
```

Quando due persone parlano contemporaneamente, Discord invia due flussi
distinti. Il bot li trascrive separatamente e conserva il nome corretto; le
righe possono comparire in un ordine leggermente diverso da quello temporale
se una delle due elaborazioni termina prima.

## Requisiti

- Python 3.11 o successivo su Windows o Linux;
- facoltativo: GPU NVIDIA con circa 10 GB di VRAM o più per `large-v3` FP16;
- Internet al primo avvio per dipendenze e modello Whisper;
- circa 4 GB di spazio iniziale per ambiente virtuale e cache del modello.

La configurazione GPU predefinita è adatta a una scheda NVIDIA da circa 12 GB.
cuBLAS e cuDNN per CUDA 12 vengono installati nella `.venv` e resi disponibili
automaticamente al processo, senza modificare il `PATH` globale di Windows.

## Creazione e invito del bot Discord

1. Apri il [Discord Developer Portal](https://discord.com/developers/applications)
   e crea una nuova applicazione.
2. Apri **Bot**, genera il token e trattalo come una password.
3. Non sono necessari Message Content Intent o altri privileged intents.
4. Apri **OAuth2 > URL Generator**.
5. Seleziona gli scope `bot` e `applications.commands`.
6. Assegna i permessi **View Channels**, **Send Messages**, **Connect**,
   **Speak** e **Use Voice Activity**.
7. Apri l'URL generato, seleziona il server e autorizza l'applicazione.

L'URL può anche essere costruito sostituendo `APPLICATION_ID`:

```text
https://discord.com/oauth2/authorize?client_id=APPLICATION_ID&permissions=36703232&scope=bot%20applications.commands
```

Il bot non si invita manualmente in un singolo canale vocale: entra
automaticamente nel canale dell'utente che lancia `/trascrivi`. Nei canali
privati, il ruolo del bot deve avere gli stessi permessi anche negli override
del canale o della categoria.

Discord richiede DAVE/E2EE per le chiamate. `requirements.txt` usa quindi una
revisione precisa di Pycord con ricezione DAVE. Non installare `discord.py`
nella stessa `.venv`, perché entrambi espongono il pacchetto Python `discord`.

## Installazione e avvio

Apri PowerShell nella cartella `discord-transcriber`:

```powershell
Copy-Item .env.example .env
notepad .env
```

Inserisci il token in `DISCORD_TOKEN`, salva e avvia:

```powershell
.\start.ps1
```

Lo script crea `.venv`, installa le dipendenze e avvia il bot. Al primo avvio
scarica `large-v3`; gli avvii successivi usano la cache locale. Lascia il
processo in esecuzione durante tutta la sessione Discord.

Su Linux:

```bash
cp .env.example .env
# Per un server senza GPU: WHISPER_MODEL=small, WHISPER_DEVICE=cpu,
# WHISPER_COMPUTE_TYPE=int8
./start.sh
```

Per eseguirlo come servizio, crea un utente dedicato e una unit systemd con
`WorkingDirectory` impostata su questa cartella e
`ExecStart=/percorso/discord-transcriber/.venv/bin/python bot.py`. Proteggi
`.env` con permessi leggibili solo da quell'utente. Il bot e il sito possono
vivere su macchine diverse: il trascrittore produce semplici file Markdown.

## Configurazione

Il file `.env.example` contiene tutti i valori disponibili:

| Variabile               |  Predefinito | Significato                          |
| ----------------------- | -----------: | ------------------------------------ |
| `DISCORD_TOKEN`         | `replace-me` | Token segreto del bot                |
| `WHISPER_MODEL`         |   `large-v3` | Modello faster-whisper               |
| `WHISPER_DEVICE`        |       `cuda` | Dispositivo di inferenza             |
| `WHISPER_COMPUTE_TYPE`  |    `float16` | Precisione GPU                       |
| `WHISPER_LANGUAGE`      |         `it` | Lingua forzata della trascrizione    |
| `SILENCE_MS`            |        `900` | Silenzio che chiude un intervento    |
| `MIN_UTTERANCE_MS`      |        `450` | Durata minima accettata              |
| `MAX_UTTERANCE_SECONDS` |         `25` | Taglio massimo del singolo frammento |

Il limite di 450 ms mantiene le frasi brevi utili e riduce i falsi positivi
prodotti da respiri, rumori e frammenti audio troppo corti. Il filtro vocale
scarta inoltre le formule isolate che Whisper tende a inventare sul silenzio.

## Utilizzo

1. Entra nel canale vocale con gli altri partecipanti.
2. In un canale testuale dello stesso server esegui `/trascrivi`.
3. Attendi la conferma privata con il nome del file locale.
4. A fine sessione esegui `/ferma` e attendi l'elaborazione dell'ultima frase.

Comandi:

- `/trascrivi` — crea un nuovo file e avvia l'ascolto;
- `/ferma` — invia gli ultimi frammenti, ferma la sessione e fa uscire il bot;
- `/stato` — mostra modello, canale e file corrente;
- `/partecipanti` — mostra i nomi Discord usati come parlanti e contesto.

Un file tipico è:

```text
transcripts/2026-10-11_21-30-00-sessione-lanterne_123456789.md
```

Può essere aperto mentre la sessione è in corso: ogni trascrizione riconosciuta
viene aggiunta immediatamente in coda al documento.

## Sessioni lunghe e risorse

Una sessione di quattro ore è compatibile con la configurazione RTX 5070:

- il modello rimane caricato una sola volta nella GPU;
- l'audio non viene accumulato per l'intera sessione;
- ogni buffer attivo è limitato a 25 secondi, circa 4,8 MB per parlante;
- il Markdown finale occupa normalmente pochi megabyte;
- più persone che parlano insieme aumentano il lavoro in proporzione al numero
  di flussi, ma non mescolano le rispettive voci.

La coda di trascrizione è attualmente in memoria. In condizioni normali una GPU
compatibile elabora più velocemente del tempo reale; un arresto del driver o un
errore persistente di inferenza può però creare arretrato. Per sessioni
importanti conviene controllare periodicamente `/stato` e il log locale. Evita
la sospensione automatica del PC durante la partita.

## Risoluzione dei problemi

### Il comando rimane su “thinking”

Il bot risponde subito con “Connessione in corso” e applica un timeout rigido di
15 secondi. Se Discord non completa l'handshake, controlla gli override del
canale e riprova. Un tentativo fallito viene rimosso dalla cache vocale per non
bloccare i tentativi successivi.

### Il bot non entra nel canale

Controlla per il ruolo del bot, sia sul server sia sul canale:

- Visualizza canale;
- Connetti;
- Parla;
- Usa attività vocale.

### Il file contiene solo l'intestazione

Il collegamento può essere attivo anche senza testo. Whisper aggiunge una riga
solo quando il VAD rileva parlato; silenzio, respiri e rumori vengono ignorati.

### CUDA non viene caricata

Aggiorna il driver NVIDIA, ricrea `.venv` e rilancia `start.ps1`. Le dipendenze
Windows `nvidia-cublas-cu12` e `nvidia-cudnn-cu12` sono dichiarate in
`requirements.txt`.

## Test

```powershell
$env:PYTHONPATH = $PWD
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe -m pip check
```

I test coprono segmentazione, attribuzione dei nomi, filtri anti-allucinazione
e conversione PCM/WAV usata da Whisper.
