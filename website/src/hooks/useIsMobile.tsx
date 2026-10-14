import { useEffect, useState } from "react";

const getIsMobile = () => window.innerWidth <= 500;

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => getIsMobile());

  const onResize = () => {
    setIsMobile(getIsMobile());
  };

  useEffect(() => {
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [window.innerWidth]);

  return isMobile;
}
