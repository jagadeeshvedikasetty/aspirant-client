import React from 'react';
import {
  Scale,
  Building2,
  Landmark,
  Shield,
  BookOpen,
  Scroll,
  Globe,
  Waves,
  Music,
  Newspaper,
  Gavel,
  BookMarked,
} from 'lucide-react';

const RULES = [
  { match: /right|libert|freedom|justice/i, Icon: Scale },
  { match: /parliament|legislat|assembly|rajya|lok sabha/i, Icon: Building2 },
  { match: /government|executive|ministry|cabinet|framework/i, Icon: Gavel },
  { match: /state|constitution|polity|governance/i, Icon: Landmark },
  { match: /history|empire|dynasty|ancient|medieval|modern/i, Icon: Scroll },
  { match: /river|geography|indus|valley/i, Icon: Waves },
  { match: /dance|art|culture|music/i, Icon: Music },
  { match: /affair|current|news/i, Icon: Newspaper },
  { match: /world|international|global/i, Icon: Globe },
  { match: /defence|security|military/i, Icon: Shield },
  { match: /book|static|gk|general/i, Icon: BookOpen },
];

function TopicIcon({ name, size = 16 }) {
  const rule = RULES.find((r) => r.match.test(name));
  const Icon = rule ? rule.Icon : BookMarked;
  return <Icon className="topic-breakdown-icon" size={size} strokeWidth={2} />;
}

export default TopicIcon;
