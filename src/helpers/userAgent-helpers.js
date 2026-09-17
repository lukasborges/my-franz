import { isMac, isWindows } from '../environment';

function macOS() {
  // used fixed version (https://bugzilla.mozilla.org/show_bug.cgi?id=1679929)
  return 'Macintosh; Intel Mac OS X 10_15_7';
}

function windows() {
  return 'Windows NT 10.0; Win64; x64';
}

function linux() {
  return 'X11; Linux x86_64';
}

/**
 * Builds the user agent Chromium would send for this Electron build.
 *
 * It must stay consistent with the Sec-CH-UA client hints Chromium emits, which
 * advertise "Chromium" rather than "Google Chrome" and cannot be changed. A
 * Chrome-shaped user agent without matching hints is read as a spoof: Cloudflare
 * Turnstile then refuses to render with error 600010 and logins that rely on it
 * fail (verified against Todoist). Dropping the Electron token or using a
 * platform token Chromium never emits, such as "Ubuntu", both trigger it.
 */
export default function userAgent() {
  let platformString = '';

  if (isMac) {
    platformString = macOS();
  } else if (isWindows) {
    platformString = windows();
  } else {
    platformString = linux();
  }

  return `Mozilla/5.0 (${platformString}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Electron/${process.versions.electron} Safari/537.36`;
}
