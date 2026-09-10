(() => {
  "use strict";

  const body = document.body;
  const dataUrl = body.dataset.dataUrl;
  const fixedArtist = body.dataset.artist || "";
  const grid = document.getElementById("songGrid");
  const countNode = document.getElementById("resultCount");
  const searchInput = document.getElementById("searchInput");
  const artistFilter = document.getElementById("artistFilter");
  const keyFilter = document.getElementById("keyFilter");
  const tabOnly = document.getElementById("tabOnly");
  const sortSelect = document.getElementById("sortSelect");

  if (!dataUrl || !grid) return;

  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  const addOption = (select, value, label = value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  };

  const normalize = (value) =>
    String(value ?? "").normalize("NFKC").toLocaleLowerCase("ja-JP");

  const searchableText = (song) =>
    normalize([
      song.title,
      song.artist,
      ...(song.releases || []),
      song.primaryKey,
      ...(song.appearingKeys || []),
      song.bpm,
    ].join(" "));

  const renderSong = (song) => {
    const article = make("article", "song-card");
    article.append(make("h3", "", song.title));
    article.append(make("p", "artist", song.artist));

    const meta = make("ul", "meta");
    if (song.year) meta.append(make("li", "", `${song.year}`));
    if (song.bpm !== undefined) meta.append(make("li", "", `BPM ${song.bpm}`));
    if (song.primaryKey) meta.append(make("li", "", `Key ${song.primaryKey}`));
    if (song.tab) meta.append(make("li", "", "TAB販売中"));
    if (meta.childElementCount) article.append(meta);

    const details = make("div", "detail-list");
    if (song.releases?.length) {
      const line = make("div");
      const strong = make("strong", "", "収録作品: ");
      line.append(strong, document.createTextNode(song.releases.join(" / ")));
      details.append(line);
    }
    if (song.primaryKey) {
      const others = (song.appearingKeys || []).filter((key) => key !== song.primaryKey);
      if (others.length) {
        const line = make("div");
        const strong = make("strong", "", "その他登場キー: ");
        line.append(strong, document.createTextNode(others.join(" / ")));
        details.append(line);
      }
    }
    if (details.childElementCount) article.append(details);

    const actions = make("div", "actions");
    if (song.tab) {
      const tabLink = make("a", "button", "TABを見る");
      tabLink.href = song.tab.url;
      tabLink.target = "_blank";
      tabLink.rel = "noopener noreferrer";
      actions.append(tabLink);
    }
    (song.videos || []).forEach((video) => {
      const videoLink = make("a", "button secondary", "演奏動画");
      videoLink.href = video.url;
      videoLink.target = "_blank";
      videoLink.rel = "noopener noreferrer";
      videoLink.title = video.title || "演奏動画";
      actions.append(videoLink);
    });
    if (actions.childElementCount) article.append(actions);

    return article;
  };

  const start = async () => {
    try {
      const response = await fetch(dataUrl, { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const baseSongs = fixedArtist
        ? data.songs.filter((song) => song.artist === fixedArtist)
        : data.songs.slice();

      if (artistFilter) {
        [...new Set(data.songs.map((song) => song.artist))]
          .sort((a, b) => a.localeCompare(b, "ja"))
          .forEach((artist) => addOption(artistFilter, artist));
      }

      if (keyFilter) {
        [...new Set(baseSongs.map((song) => song.primaryKey).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b, "en"))
          .forEach((key) => addOption(keyFilter, key));
      }

      const update = () => {
        const query = normalize(searchInput?.value);
        const artist = artistFilter?.value || fixedArtist;
        const key = keyFilter?.value || "";
        const onlyTab = Boolean(tabOnly?.checked);
        const sort = sortSelect?.value || "year-desc";

        let songs = baseSongs.filter((song) => {
          if (query && !searchableText(song).includes(query)) return false;
          if (artist && song.artist !== artist) return false;
          if (key && song.primaryKey !== key) return false;
          if (onlyTab && !song.tab) return false;
          return true;
        });

        songs.sort((a, b) => {
          if (sort === "title") return a.title.localeCompare(b.title, "ja");
          if (sort === "bpm") return (a.bpm ?? Number.POSITIVE_INFINITY) - (b.bpm ?? Number.POSITIVE_INFINITY);
          return (b.year ?? -1) - (a.year ?? -1) || a.title.localeCompare(b.title, "ja");
        });

        grid.replaceChildren();
        songs.forEach((song) => grid.append(renderSong(song)));
        countNode.textContent = `${songs.length}曲`;

        const oldEmpty = document.getElementById("emptyState");
        if (oldEmpty) oldEmpty.remove();
        if (!songs.length) {
          const empty = make("div", "empty", "条件に一致する楽曲がありません。");
          empty.id = "emptyState";
          grid.after(empty);
        }
      };

      if (searchInput) searchInput.addEventListener("input", update);
      [artistFilter, keyFilter, tabOnly, sortSelect]
        .filter(Boolean)
        .forEach((el) => el.addEventListener("change", update));

      update();
    } catch (error) {
      console.error(error);
      grid.replaceChildren();
      const message = make("div", "error", "楽曲データを読み込めませんでした。");
      grid.append(message);
      countNode.textContent = "—";
    }
  };

  start();
})();
