#!/usr/bin/env node
const reset = "\x1b[0m";
const bold = "\x1b[1m";
const dim = "\x1b[2m";
const cyan = "\x1b[36m";
const magenta = "\x1b[35m";
const yellow = "\x1b[33m";
const green = "\x1b[32m";
const blue = "\x1b[34m";

const prompts = [
  "Sci‑Fi: A linguist aboard a generation ship discovers the ship’s AI speaks in dreams.",
  "Mystery: A small town’s clocks stop at midnight; only one house keeps time.",
  "Fantasy: An apprentice cartographer maps emotions that change the shape of kingdoms.",
  "Sci‑Fi: A time‑traveler’s souvenir shop sells items that haven’t been invented yet.",
  "Mystery: A composer’s final symphony encodes the location of a missing person.",
  "Fantasy: A storm librarian loans thunder to villagers—if they return it before dawn.",
  "Sci‑Fi: An orbital beekeeper trains micro‑drones to pollinate extinct constellations.",
  "Mystery: A detective who cannot lie investigates a case where truth is fatal.",
  "Fantasy: A city built on a sleeping dragon rewrites its laws every time it turns.",
  "Sci‑Fi: Two parallel versions of you share one inbox; today both reply at once."
];

const pick = prompts[Math.floor(Math.random() * prompts.length)];

const title = `${bold}${blue}Scribely Writing Prompt${reset}`;
const boxTop = `${cyan}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${reset}`;
const boxBottom = `${cyan}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${reset}`;
const link = `${bold}${magenta}https://scribelydesigns.top/${reset}`;

console.log(title);
console.log(boxTop);
console.log(`${yellow}✦${reset} ${bold}${pick}${reset}`);
console.log(boxBottom);
console.log(`${dim}Powered by Scribely - AI Novel Generator${reset}`);
console.log(`${green}Visit: ${link}${reset}`);
