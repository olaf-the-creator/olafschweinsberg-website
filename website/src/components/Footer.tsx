import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/free-brands-svg-icons";

export type LinkButton = {
  url: string;
  icon: IconDefinition;
};

export type FooterProps = {
  links: LinkButton[];
};

const Footer = (props: FooterProps) => {
  return (
    <footer className="app-footer" aria-label="Social links">
      <div className="footer__button-container">
        {props.links.map((link) => (
          <a
            key={link.icon.iconName}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FontAwesomeIcon className="footer__icon" icon={link.icon} />
          </a>
        ))}
      </div>
    </footer>
  );
};

export default Footer;
