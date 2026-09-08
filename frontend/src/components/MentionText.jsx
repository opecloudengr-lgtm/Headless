import React from "react";
import { Link } from "react-router-dom";

const MENTION_PATTERN = /@([A-Za-z0-9_.]{3,50})/g;

/** Renders text with @mentions turned into links to that user's profile. */
export default function MentionText({ text, taggedUsers = [], className = "" }) {
  const byUsername = new Map(taggedUsers.map((u) => [u.username, u]));
  const parts = [];
  let lastIndex = 0;
  let match;

  MENTION_PATTERN.lastIndex = 0;
  while ((match = MENTION_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));

    const username = match[1];
    const tagged = byUsername.get(username);

    parts.push(
      tagged ? (
        <Link
          key={`${match.index}-${username}`}
          to={`/profile/${tagged.id}`}
          className="font-semibold text-wine-700 hover:underline"
        >
          @{username}
        </Link>
      ) : (
        match[0]
      )
    );

    lastIndex = MENTION_PATTERN.lastIndex;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return <span className={className}>{parts}</span>;
}
