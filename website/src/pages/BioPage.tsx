import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { LinkButton } from "../components/Footer";
import "../css/bio.css";

type Hobby = {
  title: string;
  detail: string;
  tag: string;
};

export type WorkItem = {
  project: string;
  projectUrl: string;
  description: string;
  sourceUrl: string;
};

const ExternalIcon = () => (
  <svg
    className="bio-page__external-icon"
    viewBox="0 0 16 16"
    width="12"
    height="12"
    aria-hidden="true"
    focusable="false"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="square"
  >
    <path d="M9 2h5v5M14 2L7 9M12 9.5V14H2V4h4.5" />
  </svg>
);

export type BioPageProps = {
  name: string;
  subheading: string;
  bioIntro: string;
  bio: string;
  topLinks: LinkButton[];
  selectedWorkNote: string;
  work: WorkItem[];
  hobbies: Hobby[];
  contactTitle: string;
  contactBody: string;
  contactPrimaryLabel: string;
  contactPrimaryHref: string;
  imageSrc: string;
};

const BioPage = (props: BioPageProps) => {
  const nameParts = props.name.trim().split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts.pop() : "";
  const firstName = nameParts.join(" ");
  const lastChunks = (lastName || "").match(/.{1,4}/g) || [];
  return (
    <main className="bio-page">
      <section className="bio-page__hero" aria-label="Profile overview">
        <div className="bio-page__topbar">
          <p className="bio-page__eyebrow">PERSONAL WEBSITE</p>
          <div
              className="bio-page__top-links"
              aria-label="Primary social links"
            >
              {props.topLinks.map((link) => (
                <a
                  key={`top-${link.icon.iconName}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FontAwesomeIcon icon={link.icon} />
                </a>
              ))}
            </div>
        </div>

        <div className="bio-page__hero-top">
          <div className="bio-page__title">
            <h1 className="bio-page__name" aria-label={props.name}>
              <span className="bio-page__name-line bio-page__name-first">
                {firstName}
              </span>
              {lastChunks.map((chunk, i) => (
                <span
                  className="bio-page__name-line"
                  key={chunk}
                  aria-hidden="true"
                >
                  {chunk}
                  {i < lastChunks.length - 1 ? "-" : ""}
                </span>
              ))}
            </h1>
          </div>

          <div className="bio-page__image">
            <img
              src={props.imageSrc}
              alt={`${props.name}'s profile portrait`}
            />
          </div>
        </div>

        <div className="bio-page__hero-bottom">
          <div className="bio-page__rail">
            <h3 className="bio-page__lead">
              {props.bioIntro}
              <span className="bio-page__lead-dot">.</span>
            </h3>
            <h2 className="bio-page__sub">{props.subheading}</h2>
          </div>
          <div className="bio-page__text">
            <p>{props.bio}</p>
          </div>
        </div>
      </section>

      <section className="bio-page__section" aria-label="Selected work">
        <div className="bio-page__section-header">
          <p>01</p>
          <h3>Selected Work</h3>
        </div>
        <div className="bio-page__table-wrap">
          <table className="bio-page__table">
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col">Description</th>
                <th scope="col">Source</th>
              </tr>
            </thead>
            <tbody>
              {props.work.map((item) => (
                <tr key={item.project}>
                  <th scope="row" className="bio-page__table-project">
                    <a
                      href={item.projectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.project}
                    </a>
                  </th>
                  <td className="bio-page__table-desc">{item.description}</td>
                  <td className="bio-page__table-source">
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${item.project} source on GitHub (opens in a new tab)`}
                    >
                      GitHub
                      <ExternalIcon />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="bio-page__note">{props.selectedWorkNote}</p>
      </section>

      <section className="bio-page__section" aria-label="Off the clock">
        <div className="bio-page__section-header">
          <p>02</p>
          <h3>Off the Clock</h3>
        </div>
        <div className="bio-page__focus-grid">
          {props.hobbies.map((hobby) => (
            <article className="bio-page__card" key={hobby.title}>
              <h4>{hobby.title}</h4>
              <p>{hobby.detail}</p>
              <span>{hobby.tag}</span>
            </article>
          ))}
        </div>
      </section>

      <section
        className="bio-page__section bio-page__contact"
        aria-label="Contact call to action"
      >
        <div className="bio-page__section-header">
          <p>03</p>
          <h3>Contact</h3>
        </div>
        <div className="bio-page__cta-panel">
          <h4>{props.contactTitle}</h4>
          <p>{props.contactBody}</p>
          <a href={props.contactPrimaryHref}>{props.contactPrimaryLabel}</a>
        </div>
      </section>
    </main>
  );
};

export default BioPage;
