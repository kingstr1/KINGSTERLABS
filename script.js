/* KINGSTER AI STUDIO - SITE, MANUAL EDITOR AND BROWSER VIDEO EXPORT */
document.addEventListener("DOMContentLoaded", () => {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".navigation a").forEach(link => {
    if (link.getAttribute("href") === currentPage) link.classList.add("active");
  });

  const $ = id => document.getElementById(id);
  const upload = $("videoUpload");
  if (!upload) return;

  const musicUpload = $("musicUpload");
  const fileStatus = $("fileStatus");
  const musicStatus = $("musicStatus");
  const clipList = $("clipList");
  const timeline = $("timeline");
  const generateBtn = $("generateBtn");
  const stopBtn = $("stopBtn");
  const status = $("generationStatus");
  const preview = $("videoPreview");
  const downloadLink = $("downloadLink");

  let clips = [];
  let selectedClip = 0;
  let musicFile = null;
  let stopRequested = false;
  let currentOutputUrl = null;
  let thumbnailUrl = null;

  const setStatus = message => { status.textContent = message; };
  const fmt = n => `${Number(n || 0).toFixed(1)}s`;

  function refreshClipLists() {
    fileStatus.textContent = clips.length ? `${clips.length} clip(s) ready.` : "No video clips selected.";
    clipList.replaceChildren();
    clips.forEach((clip, i) => {
      const li = document.createElement("li");
      li.textContent = `${i + 1}. ${clip.file.name} (${fmt(clip.end - clip.start)})`;
      clipList.appendChild(li);
    });
    timeline.replaceChildren();
    if (!clips.length) {
      const empty = document.createElement("p");
      empty.className = "empty-timeline";
      empty.textContent = "Your uploaded clips will appear here.";
      timeline.appendChild(empty);
      selectedClip = -1;
      return;
    }
    if (selectedClip < 0 || selectedClip >= clips.length) selectedClip = 0;
    clips.forEach((clip, i) => {
      const row = document.createElement("div");
      row.className = `timeline-item${i === selectedClip ? " selected" : ""}`;
      const choose = document.createElement("button");
      choose.type = "button";
      choose.className = "timeline-select";
      choose.innerHTML = `<strong>${i + 1}. ${escapeHtml(clip.file.name)}</strong><span class="timeline-meta">${fmt(clip.start)} – ${fmt(clip.end)} · ${fmt(clip.end - clip.start)}</span>`;
      choose.addEventListener("click", () => { selectedClip = i; loadSelectedClip(); refreshClipLists(); });
      const controls = document.createElement("div");
      controls.className = "timeline-controls";
      [["↑", i === 0, () => moveClip(i, -1)], ["↓", i === clips.length - 1, () => moveClip(i, 1)]].forEach(([label, disabled, action]) => {
        const button = document.createElement("button");
        button.type = "button"; button.textContent = label; button.disabled = disabled;
        button.setAttribute("aria-label", label === "↑" ? "Move clip up" : "Move clip down");
        button.addEventListener("click", action); controls.appendChild(button);
      });
      row.append(choose, controls); timeline.appendChild(row);
    });
    loadSelectedClip();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
  }

  function loadSelectedClip() {
    const clip = clips[selectedClip];
    if (!clip) return;
    $("trimStart").value = clip.start.toFixed(1);
    $("trimEnd").value = clip.end.toFixed(1);
    $("trimEnd").max = clip.duration.toFixed(1);
  }

  function moveClip(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= clips.length) return;
    [clips[index], clips[target]] = [clips[target], clips[index]];
    selectedClip = target; refreshClipLists();
  }

  upload.addEventListener("change", () => {
    clips = Array.from(upload.files || []).filter(file => file.type.startsWith("video/")).map(file => ({
      file, start: 0, end: 0, duration: 0
    }));
    selectedClip = clips.length ? 0 : -1;
    clips.forEach(async clip => {
      const url = URL.createObjectURL(clip.file);
      const v = document.createElement("video");
      v.preload = "metadata"; v.src = url;
      v.onloadedmetadata = () => {
        clip.duration = Number.isFinite(v.duration) ? v.duration : 0;
        clip.end = clip.duration;
        URL.revokeObjectURL(url);
        refreshClipLists();
      };
      v.onerror = () => { URL.revokeObjectURL(url); setStatus(`Could not read ${clip.file.name}. Try an MP4 video.`); };
    });
    refreshClipLists();
    setStatus(clips.length ? "Clips loaded. Select a clip in the timeline to edit it." : "Choose at least one video clip.");
    downloadLink.hidden = true;
  });

  musicUpload.addEventListener("change", () => {
    musicFile = musicUpload.files && musicUpload.files[0] ? musicUpload.files[0] : null;
    musicStatus.textContent = musicFile ? `Music selected: ${musicFile.name}` : "No music selected.";
  });

  $("applyTrim").addEventListener("click", () => {
    const clip = clips[selectedClip];
    if (!clip) return setStatus("Select a clip in the timeline first.");
    const start = Number($("trimStart").value), end = Number($("trimEnd").value);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > clip.duration || end <= start) {
      return setStatus(`Enter a valid trim range between 0 and ${fmt(clip.duration)}.`);
    }
    clip.start = start; clip.end = end; refreshClipLists(); setStatus("Trim applied to the selected clip.");
  });

  $("splitClip").addEventListener("click", () => {
    const clip = clips[selectedClip];
    if (!clip) return setStatus("Select a clip to split.");
    const midpoint = (clip.start + clip.end) / 2;
    if (midpoint - clip.start < .1 || clip.end - midpoint < .1) return setStatus("This clip is too short to split.");
    const second = { ...clip, start: midpoint };
    clip.end = midpoint;
    clips.splice(selectedClip + 1, 0, second);
    selectedClip += 1; refreshClipLists(); setStatus("Clip split into two timeline sections.");
  });

  $("removeClip").addEventListener("click", () => {
    if (selectedClip < 0) return setStatus("Select a clip to remove.");
    clips.splice(selectedClip, 1);
    selectedClip = clips.length ? Math.min(selectedClip, clips.length - 1) : -1;
    refreshClipLists(); setStatus("Selected clip removed from the timeline.");
  });

  const rangeLabels = [
    ["zoomStart","zoomStartValue",v => `${Number(v).toFixed(1)}×`],
    ["zoomEnd","zoomEndValue",v => `${Number(v).toFixed(1)}×`],
    ["brightness","brightnessValue",v => `${v}%`],
    ["contrast","contrastValue",v => `${v}%`],
    ["saturation","saturationValue",v => `${v}%`],
    ["vignette","vignetteValue",v => `${v}%`],
    ["blur","blurValue",v => `${v}px`],
    ["musicVolume","musicVolumeValue",v => `${v}%`]
  ];
  rangeLabels.forEach(([id, output, format]) => {
    $(id).addEventListener("input", e => { $(output).textContent = format(e.target.value); });
  });

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const waitFor = (element, eventName) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error("Timed out loading a video. Try a shorter MP4 clip.")); }, 20000);
    const done = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error("A selected video could not be decoded by this browser.")); };
    function cleanup() { clearTimeout(timer); element.removeEventListener(eventName, done); element.removeEventListener("error", fail); }
    element.addEventListener(eventName, done, { once: true });
    element.addEventListener("error", fail, { once: true });
  });

  function dimensionsFor(format) {
    if (format === "9:16") return [720,1280];
    if (format === "1:1") return [900,900];
    return [1280,720];
  }

  function getSettings() {
    const format = $("videoFormatManual").value === "match" ? $("videoFormat").value : $("videoFormatManual").value;
    return {
      format, width: dimensionsFor(format)[0], height: dimensionsFor(format)[1],
      crop: $("cropMode").value, rotate: Number($("rotate").value), speed: Number($("speed").value),
      filter: $("filter").value, brightness: Number($("brightness").value),
      contrast: Number($("contrast").value), saturation: Number($("saturation").value),
      vignette: Number($("vignette").value), blur: Number($("blur").value),
      zoomStart: Number($("zoomStart").value), zoomEnd: Number($("zoomEnd").value),
      caption: $("captionText").value.trim(), captionPosition: $("captionPosition").value,
      textColour: $("textColour").value, sticker: $("sticker").value,
      overlay: $("overlayText").value.trim(), volume: Number($("musicVolume").value) / 100,
      quality: Number($("exportQuality").value), transition: $("transitions").value,
      fadeDuration: Number($("fadeDuration").value), soundFx: $("soundFx").value,
      maxDuration: $("videoLength").value === "all" ? Infinity : Number($("videoLength").value),
      quickEffects: Array.from(document.querySelectorAll('input[name="effects"]:checked')).map(el => el.value)
    };
  }

  function drawFrame(ctx, video, settings, progress, label) {
    const w = settings.width, h = settings.height;
    const rotated = settings.rotate % 180 !== 0;
    const sourceW = rotated ? video.videoHeight : video.videoWidth;
    const sourceH = rotated ? video.videoWidth : video.videoHeight;
    const zoom = settings.zoomStart + (settings.zoomEnd - settings.zoomStart) * progress;
    let scale = settings.crop === "contain" ? Math.min(w/sourceW,h/sourceH) : Math.max(w/sourceW,h/sourceH);
    scale *= zoom;
    const dw = sourceW * scale, dh = sourceH * scale;
    ctx.save();
    ctx.clearRect(0,0,w,h);
    const filters = [];
    let brightness = settings.brightness;
    let contrast = settings.contrast;
    let saturation = settings.saturation;
    if (settings.filter === "cinema") { contrast *= 1.15; saturation *= .85; brightness *= .95; }
    if (settings.filter === "vivid") saturation *= 1.35;
    if (settings.filter === "mono" || settings.quickEffects.includes("mono")) saturation = 0;
    if (settings.filter === "warm") filters.push("sepia(.25)");
    if (settings.filter === "cool") filters.push("hue-rotate(12deg)");
    if (settings.quickEffects.includes("glow")) saturation *= 1.2;
    if (settings.blur) filters.push(`blur(${settings.blur}px)`);
    filters.push(`brightness(${brightness}%)`,`contrast(${contrast}%)`,`saturate(${saturation}%)`);
    ctx.filter = filters.join(" ");
    ctx.translate(w/2,h/2);
    ctx.rotate(settings.rotate * Math.PI/180);
    ctx.drawImage(video,-dw/2,-dh/2,dw,dh);
    ctx.restore();
    ctx.filter = "none";

    if (settings.vignette > 0) {
      const gradient = ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.18,w/2,h/2,Math.max(w,h)*.72);
      gradient.addColorStop(0,"rgba(0,0,0,0)");
      gradient.addColorStop(1,`rgba(0,0,0,${settings.vignette/100})`);
      ctx.fillStyle = gradient; ctx.fillRect(0,0,w,h);
    }
    const title = settings.overlay || label;
    if (title) drawText(ctx,title,w/2,h*.13,Math.max(24,w*.045),settings.textColour,true);
    if (settings.caption) {
      const y = settings.captionPosition === "top" ? h*.2 : settings.captionPosition === "middle" ? h*.55 : h*.88;
      drawText(ctx,settings.caption,w/2,y,Math.max(20,w*.033),settings.textColour,true);
    }
    if (settings.sticker) {
      ctx.font = `${Math.round(w*.09)}px Arial`; ctx.textAlign = "right";
      ctx.fillText(settings.sticker,w*.92,h*.22);
    }
  }

  function drawText(ctx,text,x,y,size,colour,stroke) {
    ctx.save(); ctx.font = `900 ${size}px Arial`; ctx.textAlign = "center";
    ctx.lineWidth = Math.max(3,size/8); ctx.strokeStyle = "rgba(0,0,0,.85)";
    ctx.fillStyle = colour; if (stroke) ctx.strokeText(text,x,y);
    ctx.fillText(text,x,y,ctx.canvas.width*.9); ctx.restore();
  }

  async function generate() {
    if (!clips.length) return setStatus("Please upload at least one video first.");
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return setStatus("Video export needs an updated Chrome or Edge browser.");
    const settings = getSettings();
    const canvas = document.createElement("canvas");
    canvas.width = settings.width; canvas.height = settings.height;
    const ctx = canvas.getContext("2d");
    const stream = canvas.captureStream(30);
    let audioContext = null, musicElement = null, musicUrl = null, recorder = null;
    const chunks = [];
    stopRequested = false; generateBtn.disabled = true; stopBtn.disabled = false;
    downloadLink.hidden = true; setStatus("Preparing your edit…");

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass && (musicFile || settings.soundFx !== "none")) {
        audioContext = new AudioContextClass();
        await audioContext.resume();
        const destination = audioContext.createMediaStreamDestination();
        if (musicFile) {
          musicElement = new Audio();
          musicUrl = URL.createObjectURL(musicFile);
          musicElement.src = musicUrl; musicElement.loop = true; musicElement.volume = 1;
          const musicGain = audioContext.createGain();
          musicGain.gain.value = settings.volume;
          audioContext.createMediaElementSource(musicElement).connect(musicGain).connect(destination);
          await musicElement.play();
        }
        if (settings.soundFx !== "none") {
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          oscillator.type = settings.soundFx === "chime" ? "sine" : "square";
          oscillator.frequency.value = settings.soundFx === "chime" ? 880 : 660;
          gain.gain.value = .035;
          oscillator.connect(gain).connect(destination);
          oscillator.start();
          setTimeout(() => { try { oscillator.stop(); } catch (_) {} }, 350);
        }
        destination.stream.getAudioTracks().forEach(track => stream.addTrack(track));
      }

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
      recorder = new MediaRecorder(stream,{mimeType,videoBitsPerSecond:settings.quality});
      recorder.ondataavailable = event => { if (event.data && event.data.size) chunks.push(event.data); };
      const stopped = new Promise(resolve => { recorder.onstop = resolve; });
      recorder.start(250);

      let rendered = 0;
      for (let i=0; i<clips.length && rendered<settings.maxDuration && !stopRequested; i++) {
        const clip = clips[i];
        setStatus(`Rendering clip ${i+1} of ${clips.length}…`);
        const video = document.createElement("video");
        video.preload = "auto"; video.muted = true; video.playsInline = true;
        const videoUrl = URL.createObjectURL(clip.file); video.src = videoUrl; video.load();
        await waitFor(video,"loadedmetadata");
        const from = Math.min(clip.start,Math.max(0,video.duration-.05));
        const to = Math.min(clip.end,video.duration);
        if (to <= from) { URL.revokeObjectURL(videoUrl); continue; }
        const seekReady = waitFor(video,"seeked");
        video.currentTime = from;
        await seekReady;
        video.playbackRate = settings.speed;
        await video.play();
        const realLimit = Math.min((to-from)/settings.speed,settings.maxDuration-rendered);
        const began = performance.now();
        let lastDraw = 0;
        while (!video.ended && !stopRequested && (performance.now()-began)/1000 < realLimit) {
          const elapsed = Math.min(realLimit,(performance.now()-began)/1000);
          if (performance.now()-lastDraw >= 30) {
            const progress = Math.min(1,elapsed/realLimit);
            const label = $("editStyle").value === "headshot" ? "HIGHLIGHT" : $("editStyle").value === "cinematic" ? "CINEMATIC" : $("editStyle").value === "football" ? "GAME TIME" : $("editStyle").value === "funny" ? "FUNNY MOMENT" : "KINGSTER";
            drawFrame(ctx,video,settings,progress,label);
            lastDraw = performance.now();
            setStatus(`Rendering ${i+1}/${clips.length} · ${Math.floor(rendered+elapsed)}s`);
          }
          await wait(15);
        }
        video.pause();
        rendered += Math.min(realLimit,(performance.now()-began)/1000);
        URL.revokeObjectURL(videoUrl);
        if (settings.transition === "fade" && i < clips.length-1 && !stopRequested) {
          const fadeMs = settings.fadeDuration*1000, start = performance.now();
          while (performance.now()-start < fadeMs && !stopRequested) {
            const alpha = Math.min(1,(performance.now()-start)/fadeMs);
            ctx.fillStyle = `rgba(0,0,0,${alpha})`; ctx.fillRect(0,0,settings.width,settings.height);
            await wait(30);
          }
        }
      }
      if (recorder.state !== "inactive") recorder.stop();
      await stopped;
      if (!chunks.length) throw new Error("No video data was recorded. Try a shorter MP4 clip.");
      const blob = new Blob(chunks,{type:"video/webm"});
      if (currentOutputUrl) URL.revokeObjectURL(currentOutputUrl);
      currentOutputUrl = URL.createObjectURL(blob);
      preview.src = currentOutputUrl; preview.load();
      downloadLink.href = currentOutputUrl; downloadLink.download = "kingster-edited-video.webm";
      downloadLink.hidden = false;
      setStatus(stopRequested ? "Stopped. You can download the part rendered so far." : "Your video is ready! Preview or download it below.");
    } catch (error) {
      if (recorder && recorder.state !== "inactive") recorder.stop();
      setStatus(error.message || "Something went wrong during export.");
    } finally {
      if (musicElement) musicElement.pause();
      if (musicUrl) URL.revokeObjectURL(musicUrl);
      if (audioContext) await audioContext.close().catch(() => {});
      stream.getTracks().forEach(track => track.stop());
      generateBtn.disabled = false; stopBtn.disabled = true;
    }
  }

  stopBtn.addEventListener("click",() => { stopRequested = true; setStatus("Stopping the export…"); });
  generateBtn.addEventListener("click",generate);

  $("makeThumbnail").addEventListener("click", async () => {
    if (!clips.length) return setStatus("Upload a video before creating a thumbnail.");
    const clip = clips[0], canvas = $("thumbnailCanvas"), ctx = canvas.getContext("2d");
    const video = document.createElement("video");
    const url = URL.createObjectURL(clip.file);
    video.muted = true; video.preload = "auto"; video.src = url; video.load();
    try {
      await waitFor(video,"loadedmetadata");
      const seekReady = waitFor(video,"seeked");
      video.currentTime = Math.min(clip.start,Math.max(0,video.duration-.1));
      await seekReady;
      const scale = Math.max(canvas.width/video.videoWidth,canvas.height/video.videoHeight);
      const dw = video.videoWidth*scale, dh = video.videoHeight*scale;
      ctx.drawImage(video,(canvas.width-dw)/2,(canvas.height-dh)/2,dw,dh);
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(0,0,canvas.width,canvas.height);
      const title = $("thumbnailTitle").value.trim() || "MY BEST GAMEPLAY";
      drawText(ctx,title,canvas.width/2,canvas.height*.78,76,"#ffffff",true);
      canvas.hidden = false;
      if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
      thumbnailUrl = canvas.toDataURL("image/png");
      $("thumbnailDownload").href = thumbnailUrl;
      $("thumbnailDownload").download = "kingster-thumbnail.png";
      $("thumbnailDownload").hidden = false;
      setStatus("Thumbnail created. Use the download link under the canvas.");
    } catch (error) { setStatus(error.message); }
    finally { URL.revokeObjectURL(url); }
  });

  refreshClipLists();
});
