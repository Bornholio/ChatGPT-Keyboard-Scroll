(() => {
  "use strict";

  // Security model: this local content script runs only on the two ChatGPT
  // origins in manifest.json. It reads element structure and scroll geometry,
  // never message text. It uses no Chrome APIs, storage, network, or injected code.
  // Diagnostic messages stay in this tab's console and contain no chat content.
  const DEBUG = true;
  const PREFIX = "[ChatGPT Keyboard Scroll]";
  const PAGE_FRACTION = 0.9;
  const MIN_SCROLL_RANGE = 2;

  function log(message, details) {
    if (DEBUG) {
      console.info(PREFIX, message, details ?? "");
    }
  }

  // These controls own their keyboard behavior. Checking the composed path also
  // covers controls inside shadow DOM and editable ancestors of the focused node.
  const INTERACTIVE_SELECTOR = [
    "input", "textarea", "select", "button", "a[href]", "summary", "details",
    "dialog", "audio[controls]", "video[controls]", "iframe", "object", "embed",
    "[contenteditable]:not([contenteditable='false'])",
    "[role='button']", "[role='link']", "[role='menu']", "[role='menuitem']",
    "[role='menuitemcheckbox']", "[role='menuitemradio']", "[role='dialog']",
    "[role='slider']", "[role='textbox']", "[role='searchbox']",
    "[role='combobox']", "[role='listbox']", "[role='option']",
    "[role='tab']", "[role='switch']", "[role='checkbox']",
    "[role='radio']", "[role='spinbutton']", "[role='tree']",
    "[role='treeitem']", "[role='grid']", "[role='gridcell']",
    "[role='scrollbar']", "[role='toolbar']",
    "[role='alertdialog']", "[role='radiogroup']", "[role='tablist']",
    "[role='treegrid']"
  ].join(",");

  function interactiveFocusReason(event) {
    const path = event.composedPath ? event.composedPath() : [event.target];
    for (const node of path) {
      if (!(node instanceof Element)) continue;
      if (node.isContentEditable || node.matches(INTERACTIVE_SELECTOR)) {
        // Report structure only. Never log the node, its text, or its value.
        return {
          tag: node.tagName.toLowerCase(),
          role: node.getAttribute("role") || null,
          editable: node.isContentEditable
        };
      }
    }
    return null;
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 &&
      rect.bottom > 0 && rect.top < innerHeight &&
      style.visibility !== "hidden" && style.display !== "none";
  }

  function isScrollable(element) {
    if (element.scrollHeight - element.clientHeight <= MIN_SCROLL_RANGE) {
      return false;
    }
    if (element === document.scrollingElement) return true;
    const overflowY = getComputedStyle(element).overflowY;
    return overflowY === "auto" || overflowY === "scroll" ||
      overflowY === "overlay";
  }

  function isConversationSized(element, main) {
    const rect = element.getBoundingClientRect();
    const mainRect = main.getBoundingClientRect();
    // Ignore small nested scrollers such as code samples and dropdowns.
    return rect.width >= mainRect.width * 0.5 &&
      rect.height >= Math.min(mainRect.height, innerHeight) * 0.45;
  }

  function findConversationScroller() {
    // ChatGPT can put its scroller around main or inside it. Start with main
    // and its ancestors, which cannot be a nested code sample or sidebar.
    const mains = [...document.querySelectorAll("main, [role='main']")]
      .filter(isVisible);

    for (const main of mains) {
      let element = main;
      while (element) {
        if (isVisible(element) && isScrollable(element) &&
            isConversationSized(element, main)) return element;
        element = element.parentElement;
      }

      // When main surrounds the scroller, a conversation turn gives us a
      // precise starting point. These are structural markers, not chat text.
      const turns = main.querySelectorAll(
        "[data-message-author-role], [data-testid='conversation-turn'], article"
      );
      element = turns.length ? turns[turns.length - 1].parentElement : null;
      while (element && main.contains(element)) {
        if (isVisible(element) && isScrollable(element) &&
            isConversationSized(element, main)) return element;
        element = element.parentElement;
      }

      // Last resort for markup without turn markers: choose the largest
      // conversation-sized scroll region inside main. Small embedded scrollers
      // do not qualify. Do not inspect text or generated class names.
      let best = null;
      let bestArea = 0;
      for (const candidate of main.querySelectorAll("*")) {
        if (!isScrollable(candidate) || !isVisible(candidate) ||
            !isConversationSized(candidate, main)) continue;
        const rect = candidate.getBoundingClientRect();
        const area = rect.width * rect.height;
        if (area > bestArea) {
          best = candidate;
          bestArea = area;
        }
      }
      if (best) return best;
    }
    return null;
  }

  function onKeyDown(event) {
    if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    let action;
    switch (event.key) {
      case "PageUp": action = "up"; break;
      case "PageDown": action = "down"; break;
      case "Home": action = "top"; break;
      case "End": action = "bottom"; break;
      case " ": action = event.shiftKey ? "up" : "down"; break;
      default: return;
    }

    const control = interactiveFocusReason(event);
    if (control) {
      log("Skipped key on an interactive control", { key: event.key, control });
      return;
    }

    const scroller = findConversationScroller();
    if (!scroller) {
      log("No suitable conversation scroller found", { key: event.key });
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const page = scroller.clientHeight * PAGE_FRACTION;
    // A column-reverse scroller uses 0 at the newest message and negative
    // scrollTop values toward the oldest message. ChatGPT currently uses this
    // layout; ordinary scrollers instead use 0 at the top.
    const reversed = getComputedStyle(scroller).flexDirection === "column-reverse" ||
      scroller.scrollTop < 0;
    if (action === "up") scroller.scrollBy({ top: -page, behavior: "instant" });
    if (action === "down") scroller.scrollBy({ top: page, behavior: "instant" });
    if (action === "top") {
      scroller.scrollTo({
        top: reversed ? scroller.clientHeight - scroller.scrollHeight : 0,
        behavior: "instant"
      });
    }
    if (action === "bottom") {
      scroller.scrollTo({
        top: reversed ? 0 : scroller.scrollHeight,
        behavior: "instant"
      });
    }

    log("Scrolled conversation", {
      key: event.key,
      direction: action,
      reversed,
      element: scroller.tagName.toLowerCase(),
      scrollTop: Math.round(scroller.scrollTop),
      scrollHeight: scroller.scrollHeight,
      clientHeight: scroller.clientHeight
    });
  }

  // Capture runs before ChatGPT's focused-element handlers. We cancel only
  // when a conversation scroller was found and a supported key was handled.
  document.addEventListener("keydown", onKeyDown, true);
  log("Ready (1.0.3)");
})();
