export const CONFIG = {
  USER_NAME: "kanywst",
};

/** GitHub serves the profile picture at `/<user>.png`; `size` is the square edge in px. */
export const avatarUrl = (size: number) =>
  `https://github.com/${CONFIG.USER_NAME}.png?size=${size}`;

export const PROFILE_URL = `https://github.com/${CONFIG.USER_NAME}`;
