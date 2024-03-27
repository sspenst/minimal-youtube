const options: Record<string, boolean> = {
  home: true,
  shorts: false,
  subscriptions: true,
  comments: true,
  related: true,
  news: false,
};

let originalLogoOnclick: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null | undefined = undefined;

function countMajorSections() {
  let count = 0;
  
  if (options.home) {
    count++;
  }

  if (options.shorts) {
    count++;
  }

  if (options.subscriptions) {
    count++;
  }

  return count;
}

function getLogoOnclick() {
  // don't return anything until we have set the originalLogoOnclick
  if (originalLogoOnclick === undefined) {
    return null;
  }

  if (options.home) {
    return originalLogoOnclick;
  }

  if (options.subscriptions) {
    return (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const a = document.querySelector("a[href='/feed/subscriptions']") as HTMLAnchorElement | null;

      if (a) {
        a.click();
      } else {
        // subscriptions link may not be available if we haven't opened the guide yet
        window.location.href = "/feed/subscriptions";
      }
    };
  }

  if (options.shorts) {
    return (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const a = document.querySelector("a[title='Shorts']") as HTMLAnchorElement | null;

      if (a) {
        a.click();
      } else {
        // shorts link may not be available if we haven't opened the guide yet
        window.location.href = "/shorts";
      }
    };
  }

  return originalLogoOnclick;
}

function clean() {
  // need to specify the class because there are multiple elements with this id
  const logo = document.querySelector("a[id='logo']") as HTMLAnchorElement | null;

  if (logo) {
    if (originalLogoOnclick === undefined) {
      originalLogoOnclick = logo.onclick;
    }

    logo.onclick = getLogoOnclick();
  }

  // major sections in nav bar
  const guideSections = document.querySelectorAll("ytd-guide-section-renderer") as NodeListOf<HTMLElement>;

  if (guideSections.length > 0) {
    // major links + you section
    const mainGuideSection = guideSections[0];
    const you = mainGuideSection.querySelector("ytd-guide-collapsible-section-entry-renderer") as HTMLElement | null;
  
    if (you) {
      if (countMajorSections() === 0) {
        you.style.marginTop = "0";
        you.style.borderTopWidth = "0";
        you.style.paddingTop = "0";
      } else {
        you.style.marginTop = "12px";
        you.style.borderTopWidth = "1px";
        you.style.paddingTop = "12px";
      }
    }
  }

  // breaking news and shorts on home/subscriptions pages
  for (const richSection of document.querySelectorAll("ytd-rich-section-renderer") as NodeListOf<HTMLElement>) {
    const span = richSection.querySelector("span");

    if (!span) {
      continue;
    }

    if (span.innerText === "Breaking news") {
      richSection.style.display = options.news ? "flex" : "none";
    } else if (span.innerText === "Shorts") {
      richSection.style.display = options.shorts ? "flex" : "none";
    }
  }

  // shorts in search results
  for (const reelShelf of document.querySelectorAll("ytd-reel-shelf-renderer") as NodeListOf<HTMLElement>) {
    reelShelf.style.display = options.shorts ? "flex" : "none";
  }

  // links to shorts
  for (const short of document.querySelectorAll("a[href*='/shorts']")) {
    const videoRenderer = short.closest("ytd-video-renderer") as HTMLElement | null;

    if (videoRenderer) {
      videoRenderer.style.display = options.shorts ? "block" : "none";
    }
  }

  // video category pills
  for (const chip of document.querySelectorAll("yt-chip-cloud-chip-renderer") as NodeListOf<HTMLElement>) {
    if (chip.innerText === "Shorts") {
      chip.style.display = options.shorts ? "inline-flex" : "none";
    }
  }

  // profile tabs
  for (const tab of document.querySelectorAll("yt-tab-shape") as NodeListOf<HTMLElement>) {
    if (tab.innerText === "Shorts") {
      tab.style.display = options.shorts ? "flex" : "none";
    }
  }

  // related videos column
  // need to specify the class because sometimes youtube adds multiple elements with this id
  const secondary = document.querySelector("ytd-watch-flexy #secondary") as HTMLElement | null;

  if (secondary) {
    // has no visible effect unless we hide secondary, so we can always set this
    const parent = secondary.parentElement;

    if (parent) {
      parent.style.justifyContent = "center";
    }

    // we want to hide the entire secondary section if we can, but if show chat replay exists we can't
    let hideSecondary = true;

    // TODO:
    // ytd-playlist-panel-renderer check for any yt-formatted-string (or maybe any text at all?)
    // some generic technique like that could work playlists, chat-container, and dontaion-shelf
    // also need to figure out how to adjust the ux when the video is collapsed

    const chatContainer = secondary.querySelector("div#chat-container");

    if (chatContainer) {
      const span = chatContainer.querySelector("span");

      if (span && span.innerText === "Show chat replay") {
        hideSecondary = false;
      }
    }

    secondary.style.display = options.related || !hideSecondary ? "block" : "none";

    const relatedVideos = document.getElementById("related");
    
    if (relatedVideos) {
      relatedVideos.style.display = options.related || hideSecondary ? "block" : "none";
    }
  }

  // hide ytd-comments
  for (const comments of document.querySelectorAll("ytd-comments") as NodeListOf<HTMLElement>) {
    comments.style.display = options.comments ? "block" : "none";
  }
}

function setupObserver() {
  const observer = new MutationObserver(clean);
  
  observer.observe(document.body, { childList: true, subtree: true });  
}

setupObserver();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') {
    return;
  }

  for (const key in options) {
    if (key in changes) {
      options[key] = changes[key].newValue;
    }
  }

  clean();
});

chrome.storage.local.get(Object.keys(options), (data) => {
  for (const key in options) {
    if (data[key] !== undefined) {
      options[key] = data[key];
    }
  }

  chrome.runtime.sendMessage({ 'init': options });

  clean();
});
