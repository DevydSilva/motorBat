/**
 * Avatar circular com iniciais ou imagem; usado na sidebar e menus.
 */
import { useEffect, useState } from "react";
import { resolveDisplayAvatarUrl } from "@/constants/userAvatar";

function PillAvatar({ profileRole, userPhotoDataUrl = "", className = "" }) {
  const src = resolveDisplayAvatarUrl(profileRole, userPhotoDataUrl);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  if (imgFailed) {
    return <i className={`ri-user-3-fill pill-avatar__fallback ${className}`.trim()} aria-hidden />;
  }

  return (
    <img
      src={src}
      alt=""
      className={`pill-avatar__img ${className}`.trim()}
      width={36}
      height={36}
      onError={() => setImgFailed(true)}
    />
  );
}

export default PillAvatar;
