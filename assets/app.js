(() => {
  "use strict";

  const body = document.body;
  const dataUrl = body.dataset.dataUrl;
  const capoUrl = body.dataset.capoUrl || "";
  const aoooCapoUrl = body.dataset.aoooCapoUrl || "";
  const fixedArtist = body.dataset.artist || "";
  const grid = document.getElementById("songGrid");
  const countNode = document.getElementById("resultCount");
  const searchInput = document.getElementById("searchInput");
  const artistFilter = document.getElementById("artistFilter");
  const keyFilter = document.getElementById("keyFilter");
  const yearFilter = document.getElementById("yearFilter");
  const effectFilter = document.getElementById("effectFilter");
  const capoFilter = document.getElementById("capoFilter");
  const syncFilter = document.getElementById("syncFilter");
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

  const keyChips = (keys) => {
    const wrapper = make("span", "key-chips");
    keys.forEach((key) => wrapper.append(make("span", "key-chip", key)));
    return wrapper;
  };

  const addDetail = (details, label, value) => {
    const line = make("div", "detail-row");
    line.append(make("strong", "", label));
    if (typeof value === "string") {
      line.append(document.createTextNode(value));
    } else {
      line.append(value);
    }
    details.append(line);
  };

  const renderSong = (song) => {
    const article = make("article", "song-card");
    article.append(make("h3", "", song.title));
    article.append(make("p", "artist", song.artist));

    const meta = make("ul", "meta");
    if (fixedArtist === "UNISON SQUARE GARDEN" && song.sync) {
      meta.append(make("li", "", "同期あり"));
    }
    if (meta.childElementCount) article.append(meta);

    const details = make("div", "detail-list");
    if (song.releases?.length) addDetail(details, "収録作品: ", song.releases.join(" / "));
    if (song.year) addDetail(details, "リリース年: ", `${song.year}`);
    if (song.primaryKey) addDetail(details, "主キー: ", keyChips([song.primaryKey]));

    const others = song.primaryKey
      ? (song.appearingKeys || []).filter((key) => key !== song.primaryKey)
      : (song.appearingKeys || []);
    if (others.length) addDetail(details, "他の登場キー: ", keyChips(others));

    if (song.artist === "UNISON SQUARE GARDEN" && song.capo !== undefined) {
      addDetail(details, "カポ: ", song.capo === 0 ? "なし" : `${song.capo}カポ`);
    }
    if (song.artist === "Aooo") {
      if (song.leadCapo !== undefined) {
        addDetail(details, "Lead Gtカポ: ", song.leadCapo === 0 ? "なし" : `${song.leadCapo}カポ`);
      }
      if (song.rhythmCapo !== undefined) {
        addDetail(details, "Rhythm Gtカポ: ", song.rhythmCapo === 0 ? "なし" : `${song.rhythmCapo}カポ`);
      }
    }
    if (song.bpm !== undefined) addDetail(details, "基準BPM: ", `${song.bpm}`);
    if (song.tabPart && song.artist !== "UNISON SQUARE GARDEN" && song.artist !== "Aooo") {
      addDetail(details, "TABパート: ", song.tabPart);
    }
    if (details.childElementCount) article.append(details);

    const actions = make("div", "actions");
    if (song.tab) {
      const tabLink = make("a", "button", "PiascoreでギターTABを見る");
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

      let capoData = null;
      if (capoUrl) {
        const capoResponse = await fetch(capoUrl, { cache: "no-cache" });
        if (!capoResponse.ok) throw new Error(`Capo HTTP ${capoResponse.status}`);
        capoData = await capoResponse.json();
      }

      let aoooCapoData = null;
      if (aoooCapoUrl) {
        const aoooCapoResponse = await fetch(aoooCapoUrl, { cache: "no-cache" });
        if (!aoooCapoResponse.ok) throw new Error(`Aooo capo HTTP ${aoooCapoResponse.status}`);
        aoooCapoData = await aoooCapoResponse.json();
      }

      const songs = data.songs.map((row) => {
        const [title, artistIndex, releaseIndexes, year, primaryKeyIndex, appearingKeyIndexes, bpm, piascoreScoreId, videos, sync, effectIndexes, tabPart] = row;
        const song = {
          title,
          artist: data.artists[artistIndex],
          sync: Boolean(sync),
        };
        if (releaseIndexes) song.releases = releaseIndexes.map((index) => data.releases[index]);
        if (year !== null && year !== undefined) song.year = year;
        if (primaryKeyIndex !== null && primaryKeyIndex !== undefined) song.primaryKey = data.keys[primaryKeyIndex];
        if (appearingKeyIndexes) song.appearingKeys = appearingKeyIndexes.map((index) => data.keys[index]);
        if (bpm !== null && bpm !== undefined) song.bpm = bpm;
        if (piascoreScoreId) {
          song.tab = {
            scoreId: piascoreScoreId,
            url: data.piascoreUrlTemplate.replace("{scoreId}", piascoreScoreId),
          };
        }
        if (videos) song.videos = videos.map(([videoTitle, url]) => ({ title: videoTitle, url }));
        if (effectIndexes) song.effects = effectIndexes.map((index) => data.effects[index]);
        if (tabPart) song.tabPart = tabPart;
        if (capoData && song.artist === capoData.artist) {
          song.capo = capoData.exceptions?.[title] ?? capoData.default;
        }
        if (aoooCapoData && song.artist === aoooCapoData.artist) {
          const aoooCapo = aoooCapoData.songs?.[title];
          if (Number.isInteger(aoooCapo?.lead)) song.leadCapo = aoooCapo.lead;
          if (Number.isInteger(aoooCapo?.rhythm)) song.rhythmCapo = aoooCapo.rhythm;
        }
        return song;
      });
      const baseSongs = fixedArtist
        ? songs.filter((song) => song.artist === fixedArtist)
        : songs.slice();

      if (artistFilter) {
        [...new Set(songs.map((song) => song.artist))]
          .sort((a, b) => a.localeCompare(b, "ja"))
          .forEach((artist) => addOption(artistFilter, artist));
      }

      if (keyFilter) {
        [...new Set(baseSongs.map((song) => song.primaryKey).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b, "en"))
          .forEach((key) => addOption(keyFilter, key));
      }

      if (yearFilter) {
        [...new Set(baseSongs.map((song) => song.year).filter((year) => year !== undefined))]
          .sort((a, b) => b - a)
          .forEach((year) => addOption(yearFilter, String(year), String(year)));
      }

      if (capoFilter) {
        [...new Set(baseSongs.map((song) => song.capo).filter((capo) => Number.isInteger(capo) && capo > 0))]
          .sort((a, b) => a - b)
          .forEach((capo) => addOption(capoFilter, String(capo), `${capo}カポ`));
      }

      const effectRank = new Map((data.effects || []).map((effect, index) => [effect, index]));
      const refreshEffectOptions = () => {
        if (!effectFilter) return;
        const selected = effectFilter.value;
        const artist = artistFilter?.value || fixedArtist;
        const source = artist
          ? baseSongs.filter((song) => song.artist === artist)
          : baseSongs;
        const options = [...new Set(
          source.flatMap((song) => song.effects || []).filter((effect) => effect && effect !== "不明")
        )].sort((a, b) => (effectRank.get(a) ?? 999) - (effectRank.get(b) ?? 999) || a.localeCompare(b, "en"));

        effectFilter.replaceChildren();
        addOption(effectFilter, "", "すべて");
        options.forEach((effect) => addOption(effectFilter, effect));
        effectFilter.value = options.includes(selected) ? selected : "";
      };

      refreshEffectOptions();

      const update = () => {
        const query = normalize(searchInput?.value);
        const artist = artistFilter?.value || fixedArtist;
        const key = keyFilter?.value || "";
        const year = yearFilter?.value || "";
        const effect = effectFilter?.value || "";
        const capo = capoFilter?.value || "";
        const sync = syncFilter?.value || "";
        const onlyTab = Boolean(tabOnly?.checked);
        const sort = sortSelect?.value || "year-desc";

        let songs = baseSongs.filter((song) => {
          if (query && !searchableText(song).includes(query)) return false;
          if (artist && song.artist !== artist) return false;
          if (key && song.primaryKey !== key) return false;
          if (year && String(song.year) !== year) return false;
          if (effect && !(song.effects || []).includes(effect)) return false;
          if (capo === "yes" && !(song.capo > 0)) return false;
          if (capo === "no" && song.capo !== 0) return false;
          if (/^\d+$/.test(capo) && song.capo !== Number(capo)) return false;
          if (sync === "yes" && !song.sync) return false;
          if (sync === "no" && song.sync) return false;
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
      if (artistFilter) {
        artistFilter.addEventListener("change", () => {
          refreshEffectOptions();
          update();
        });
      }
      [keyFilter, yearFilter, effectFilter, capoFilter, syncFilter, tabOnly, sortSelect]
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
