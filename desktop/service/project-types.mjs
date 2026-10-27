// Starter tabs for projects created from Workspace's + button. Each tab becomes
// a Markdown file in the new card's folder. Keep the type IDs in sync with
// PROJECT_TYPES in src/lib/categories.ts.

const tab = (name, ...sections) => ({ name, sections });

export const PROJECT_TYPES = {
  dev: [
    tab('Overview', ['Goal', 'What this project should achieve and for whom.'], ['Scope', 'What is in, and what is deliberately left out.']),
    tab('Plan', ['Milestones', '1. First milestone'], ['Open questions', '- ']),
    tab('Notes', ['Decisions', 'Record decisions with the date and the reason.'], ['Links', '- ']),
  ],
  book: [
    tab('Overview', ['Premise', 'The story in one or two sentences.'], ['Genre and audience', ''], ['Themes', '- ']),
    tab('Characters', ['Main characters', '### Name\n\n- Role:\n- Wants:\n- Fears:\n- Arc:'], ['Supporting characters', '- ']),
    tab('Story Board', ['Act one', '- '], ['Act two', '- '], ['Act three', '- ']),
    tab('Chapters', ['Chapter list', '| # | Title | Summary | Status |\n| --- | --- | --- | --- |\n| 1 |  |  | Planned |']),
    tab('World', ['Setting', 'Time, place and the rules of this world.'], ['Locations', '- ']),
    tab('Research', ['Sources', '- '], ['Notes', '']),
  ],
  game: [
    tab('Overview', ['Pitch', 'The game in one or two sentences.'], ['Pillars', '- '], ['Platform and engine', '']),
    tab('Game Design', ['Core loop', 'What the player does minute to minute.'], ['Mechanics', '- '], ['Progression', '']),
    tab('Characters', ['Player characters', '- '], ['Enemies and NPCs', '- ']),
    tab('Levels', ['Level list', '| Level | Goal | Key mechanic | Status |\n| --- | --- | --- | --- |\n|  |  |  | Planned |']),
    tab('Art & Audio', ['Art direction', 'Style, palette and references.'], ['Audio', 'Music and sound direction.']),
    tab('Development', ['Current build', 'Version, what works and what to test.'], ['Next steps', '1. ']),
  ],
  app: [
    tab('Overview', ['Problem', 'Who has this problem and why it matters.'], ['Users', '- '], ['Success', 'How you will know the app works.']),
    tab('Features', ['Must have', '- '], ['Later', '- ']),
    tab('Screens', ['Screen list', '| Screen | Purpose | Status |\n| --- | --- | --- |\n|  |  | Planned |'], ['User flows', '- ']),
    tab('Architecture', ['Stack', 'Platforms, frameworks and services.'], ['Data', 'What is stored and where.']),
    tab('Roadmap', ['Milestones', '1. Prototype\n2. First release']),
  ],
  website: [
    tab('Overview', ['Purpose', 'What the site is for and who visits it.'], ['Goals', '- ']),
    tab('Site Map', ['Pages', '- Home\n- About\n- Contact']),
    tab('Content', ['Page copy', 'Draft text for each page.'], ['Assets', 'Images, logos and media to prepare.']),
    tab('Design', ['Look and feel', 'Style, colors, fonts and references.'], ['Layout', '']),
    tab('Launch', ['Domain and hosting', ''], ['Checklist', '- [ ] Content reviewed\n- [ ] Links checked\n- [ ] Mobile tested']),
  ],
};

export const tabFile = name => `${name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.md`;

export function tabMarkdown(title, { name, sections }) {
  return [`# ${title}: ${name}`, ...sections.map(([heading, body]) => body ? `## ${heading}\n\n${body}` : `## ${heading}`)].join('\n\n') + '\n';
}
