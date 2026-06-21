import { Heading, saveHeading } from './headings';
import { buildProfile } from './stylometry';

export const demoCasualHeading: Heading = {
  id: 'demo_casual_voice',
  name: 'Casual Posts',
  description: 'Short, punchy social writing — tweets, captions, quick takes',
  samples: [
    `I love this. It's so good. Really great. Who knew? Not me. But honestly, it works. And it's fast. Super fast. Incredible, honestly.`,
    `Just finished the most chaotic sprint ever. But we shipped. We actually shipped. The team crushed it. Zero regrets. Well, maybe like three regrets, but who's counting?`,
    `Hot take: good design is invisible. You don't notice it. You just feel it. If you're noticing the design, something went wrong. Anyway here's a thread about that.`,
  ],
  profile: buildProfile([
    `I love this. It's so good. Really great. Who knew? Not me. But honestly, it works. And it's fast. Super fast. Incredible, honestly.`,
    `Just finished the most chaotic sprint ever. But we shipped. We actually shipped. The team crushed it. Zero regrets. Well, maybe like three regrets, but who's counting?`,
    `Hot take: good design is invisible. You don't notice it. You just feel it. If you're noticing the design, something went wrong. Anyway here's a thread about that.`,
  ]),
  createdAt: Date.now() - 86400000,
  updatedAt: Date.now() - 86400000,
};

export const demoEssayHeading: Heading = {
  id: 'demo_essay_voice',
  name: 'Thoughtful Essays',
  description: 'Longer writing — newsletters, blog posts, reflections',
  samples: [
    `The way we express ourselves through written word has fundamentally changed over the past decade. Consider the implications of this shift—it affects everything from how we think to how we connect with others. This matters more than we realize.`,
    `There's a quiet revolution happening in how creators think about their craft. Not the flashy kind with listicles and viral moments, but the deep kind where people are asking harder questions about what they actually want to say and why.`,
    `I've been thinking about authenticity a lot lately. What does it mean to be authentic online? Is it even possible when there's always an audience? These questions don't have easy answers, but wrestling with them is what makes the work worthwhile.`,
  ],
  profile: buildProfile([
    `The way we express ourselves through written word has fundamentally changed over the past decade. Consider the implications of this shift—it affects everything from how we think to how we connect with others. This matters more than we realize.`,
    `There's a quiet revolution happening in how creators think about their craft. Not the flashy kind with listicles and viral moments, but the deep kind where people are asking harder questions about what they actually want to say and why.`,
    `I've been thinking about authenticity a lot lately. What does it mean to be authentic online? Is it even possible when there's always an audience? These questions don't have easy answers, but wrestling with them is what makes the work worthwhile.`,
  ]),
  createdAt: Date.now() - 172800000,
  updatedAt: Date.now() - 172800000,
};

export const demoFounderHeading: Heading = {
  id: 'demo_founder_voice',
  name: 'Founder Updates',
  description: 'Investor/team updates — direct, data-informed, optimistic',
  samples: [
    `We hit 10k users this month. Didn't expect that this early. The growth is coming from organic referrals—people sharing the tool with their teams. That's the best kind of growth because it means the product is actually useful, not just marketed well.`,
    `Here's what we're focused on next quarter: improving onboarding (50% of signups drop off before creating their first project), launching a team plan, and hiring two engineers. We're being deliberate about headcount. Small team, high trust, fast shipping.`,
    `Biggest lesson from this month—don't build what users say they want. Build what you see them struggling with. Three different customers asked for a dashboard. What they actually needed was better notifications. We built notifications. Retention jumped 22%.`,
  ],
  profile: buildProfile([
    `We hit 10k users this month. Didn't expect that this early. The growth is coming from organic referrals—people sharing the tool with their teams. That's the best kind of growth because it means the product is actually useful, not just marketed well.`,
    `Here's what we're focused on next quarter: improving onboarding (50% of signups drop off before creating their first project), launching a team plan, and hiring two engineers. We're being deliberate about headcount. Small team, high trust, fast shipping.`,
    `Biggest lesson from this month—don't build what users say they want. Build what you see them struggling with. Three different customers asked for a dashboard. What they actually needed was better notifications. We built notifications. Retention jumped 22%.`,
  ]),
  createdAt: Date.now() - 259200000,
  updatedAt: Date.now() - 259200000,
};

export const demoStudentHeading: Heading = {
  id: 'demo_student_voice',
  name: 'Student Reflection',
  description: 'Personal essays, applications, reflective writing',
  samples: [
    `I didn't think I'd learn anything from the group project. I was wrong. Working with people who think completely differently than me was frustrating at first, but it pushed me to explain my ideas better and actually listen to theirs. That's not something you get from a textbook.`,
    `The part of the semester that stuck with me most wasn't a lecture or an assignment. It was a conversation with my professor after class about why I chose this major. She asked me what problem I wanted to solve, not what job I wanted. I've been thinking about that distinction ever since.`,
    `I used to think being good at something meant being fast at it. This class showed me that being good means being willing to be slow—to sit with a problem, to try approaches that don't work, to ask for help without feeling like you've failed. That shift changed how I approach everything.`,
  ],
  profile: buildProfile([
    `I didn't think I'd learn anything from the group project. I was wrong. Working with people who think completely differently than me was frustrating at first, but it pushed me to explain my ideas better and actually listen to theirs. That's not something you get from a textbook.`,
    `The part of the semester that stuck with me most wasn't a lecture or an assignment. It was a conversation with my professor after class about why I chose this major. She asked me what problem I wanted to solve, not what job I wanted. I've been thinking about that distinction ever since.`,
    `I used to think being good at something meant being fast at it. This class showed me that being good means being willing to be slow—to sit with a problem, to try approaches that don't work, to ask for help without feeling like you've failed. That shift changed how I approach everything.`,
  ]),
  createdAt: Date.now() - 345600000,
  updatedAt: Date.now() - 345600000,
};

export const demoTechBlogHeading: Heading = {
  id: 'demo_techblog_voice',
  name: 'Technical Blog',
  description: 'Dev blogs, tutorials, technical explanations',
  samples: [
    `Here's the thing about web workers—they're not hard to use, but they're easy to use wrong. The most common mistake I see is serializing huge objects back and forth between the main thread and the worker. At that point you're paying more for the data transfer than you're saving on computation.`,
    `I rewrote our auth middleware last week. The old version was 400 lines of spaghetti that nobody wanted to touch. The new version is 80 lines. The trick wasn't cleverness—it was deleting the six edge cases we'd been handling that turned out to be bugs, not features. Sometimes less code is the actual fix.`,
    `If you're building a scoring system—any scoring system—start with the dumbest possible version. Hardcoded weights, no ML, no embeddings. Get the input/output contract right first. You can always make the internals smarter later. You can't unfuck a bad API.`,
  ],
  profile: buildProfile([
    `Here's the thing about web workers—they're not hard to use, but they're easy to use wrong. The most common mistake I see is serializing huge objects back and forth between the main thread and the worker. At that point you're paying more for the data transfer than you're saving on computation.`,
    `I rewrote our auth middleware last week. The old version was 400 lines of spaghetti that nobody wanted to touch. The new version is 80 lines. The trick wasn't cleverness—it was deleting the six edge cases we'd been handling that turned out to be bugs, not features. Sometimes less code is the actual fix.`,
    `If you're building a scoring system—any scoring system—start with the dumbest possible version. Hardcoded weights, no ML, no embeddings. Get the input/output contract right first. You can always make the internals smarter later. You can't unfuck a bad API.`,
  ]),
  createdAt: Date.now() - 432000000,
  updatedAt: Date.now() - 432000000,
};

export const ALL_DEMO_HEADINGS = [
  demoCasualHeading,
  demoEssayHeading,
  demoFounderHeading,
  demoStudentHeading,
  demoTechBlogHeading,
];

export const demoAIDraft = `This innovative platform represents a paradigm shift in how we approach digital communication. The sophisticated algorithms enable unprecedented levels of personalization and engagement. Furthermore, the implementation demonstrates a commitment to both accessibility and performance optimization. We believe that our comprehensive solutions will significantly enhance user satisfaction metrics across all key performance indicators.`;

export const demoCreatorDraft = `I've been playing with this thing for a week and honestly? It just works. Not in the "it checks all the boxes" way—more like it actually gets out of your way and lets you write. The team behind it clearly cares about the craft. That matters more than any feature list.`;

export const demoCompareAI = `In today's fast-paced world, effective communication has become more important than ever. Organizations must leverage cutting-edge technology to streamline their messaging and optimize engagement across all channels. Furthermore, the implementation of comprehensive solutions facilitates unprecedented levels of personalization. We believe these innovative approaches will transform how stakeholders interact with digital content, driving significant impact across key performance indicators.`;

export const demoCompareCreator = `Here's the thing about good communication—it doesn't need to sound smart. It needs to sound like you. I've watched so many creators lose their voice trying to sound "professional" and honestly? The best posts I've ever written were the ones where I just talked like a person. No jargon. No filler. Just real thoughts, written the way I'd say them out loud.`;

export async function loadDemoData() {
  try {
    for (const heading of ALL_DEMO_HEADINGS) {
      await saveHeading(heading);
    }
    return true;
  } catch (err) {
    console.error('Failed to load demo data:', err);
    return false;
  }
}
