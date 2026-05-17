/**
 * Badge do utilizador no cabeçalho com nome, papel e avatar resolvido.
 */
import { useEffect, useState } from "react";
import { resolveAvatarUrl } from "@/constants/userAvatar";

function UserMenuBadge({ userName, profileRole, showAvatar = true, variant = "default" }) {
  const src = resolveAvatarUrl(profileRole);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const rootClass = [
    "user-menu-badge",
    !showAvatar && "user-menu-badge--text-only",
    variant === "sidebar" && "user-menu-badge--sidebar"
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} title={userName}>
      {showAvatar ? (
        imgFailed ? (
          <span className="user-avatar user-avatar--fallback" aria-hidden="true">
            <i className="ri-user-3-fill" />
          </span>
        ) : (
          <img
            src={src}
            alt=""
            className="user-avatar"
            width={variant === "sidebar" ? 48 : 40}
            height={variant === "sidebar" ? 48 : 40}
            onError={() => setImgFailed(true)}
          />
        )
      ) : null}
      <span className="user-menu-badge__name">{userName}</span>
    </div>
  );
}

export default UserMenuBadge;
