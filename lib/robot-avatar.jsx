import React from 'react';
import { profileAvatar } from './profile-options.mjs';

export function RobotAvatar({ variant = 'robot', role = 'member', pronouns, decorative = false }) {
  const { emoji, label } = profileAvatar({ avatar: variant, role, pronouns });
  return <span
    className="tech-emoji"
    role={decorative ? undefined : 'img'}
    aria-hidden={decorative ? true : undefined}
    aria-label={decorative ? undefined : label}
  >{emoji}</span>;
}
