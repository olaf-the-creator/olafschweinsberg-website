import React from "react";
import "./css/App.css";
import BioPage, { BioPageProps } from "./pages/BioPage";
import image from "../src/assets/portrait_2.jpeg";
import Footer, { FooterProps } from "./components/Footer";
import {
  faGithub,
  faGoogle,
  faInstagram,
  faLinkedin,
} from "@fortawesome/free-brands-svg-icons";

const bioProps: Omit<BioPageProps, "topLinks"> = {
  name: "OLAF SCHWEINSBERG",
  subheading: "AI Product Director, former Amazon Software Engineer",
  bioIntro: "AI product leader, builder, very proud dad",
  bio: "I started in supply chain analytics, where I built an ML model that predicted when cargo ships would show up. It turned out, building was the only part of that job I really liked. So I taught myself to code and spent five years as an engineer at Amazon, scaling AI inside operations that still ran on spreadsheets. Now I lead AI product strategy at Epicor in Washington, D.C., and I still prototype my own ideas before asking anyone to fund them. My toughest stakeholders though are at home. As a new father, I’ve learned that no roadmap survives bedtime.",
  selectedWorkNote:
    "This site is built and hosted by me, from scratch, with no Wix, Squarespace or other no-code platform involved. More projects will be posted here soon.",
  work: [
    {
      project: "ArsenalIQ",
      projectUrl: "https://www.olafschweinsberg.com/arsenal-iq/",
      description:
        "A proof-of-concept pitching analytics app for an MLB front office, surfacing Stuff+, Location+ and Pitching+ models as 20-80 scouting grades. Built with Vue 3 and Vite, backed by a PRD and decisions log.",
      sourceUrl: "https://github.com/olaf-the-creator/arsenal-iq",
    },
  ],
  hobbies: [
    {
      title: "Robotics + Edge AI",
      detail:
        "Tinkering with autonomous robotics, edge intelligence and practical TinyML to see how intelligent behavior holds up on small, real hardware.",
      tag: "Hands-on hardware",
    },
    {
      title: "Photography + Design",
      detail:
        "Visual work across photography and design, applying the same discipline of structure and signal I bring to software.",
      tag: "Visual craft",
    },
    {
      title: "Sports + Family",
      detail:
        "The two biggest passions in my life. Ask me which one ranks higher during playoff season and I'll plead the fifth.",
      tag: "Always in season",
    },
  ],
  contactTitle: "Let's talk about AI that ships.",
  contactBody:
    "Open to conversations on AI product strategy, forward deployed engineering and bringing AI into enterprise software.",
  contactPrimaryLabel: "Connect",
  contactPrimaryHref: "mailto:olaf.create@gmail.com",
  imageSrc: image,
};

const footerProps: FooterProps = {
  links: [
    { icon: faGithub, url: "https://github.com/olaf-the-creator" },
    { icon: faInstagram, url: "https://www.instagram.com/olafschweinsberg" },
    { icon: faLinkedin, url: "https://www.linkedin.com/in/olafschweinsberg" },
    { icon: faGoogle, url: "mailto:olaf.create@gmail.com" },
  ],
};

function App() {
  return (
    <div className="app-wrapper">
      <BioPage
        name={bioProps.name}
        subheading={bioProps.subheading}
        bioIntro={bioProps.bioIntro}
        bio={bioProps.bio}
        topLinks={footerProps.links}
        selectedWorkNote={bioProps.selectedWorkNote}
        work={bioProps.work}
        hobbies={bioProps.hobbies}
        contactTitle={bioProps.contactTitle}
        contactBody={bioProps.contactBody}
        contactPrimaryLabel={bioProps.contactPrimaryLabel}
        contactPrimaryHref={bioProps.contactPrimaryHref}
        imageSrc={bioProps.imageSrc}
      />
      <Footer links={footerProps.links} />
    </div>
  );
}

export default App;
