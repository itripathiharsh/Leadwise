export interface EmojiItem {
  emoji: string
  name: string
  category: string
  keywords: string[]
}

export interface EmojiCategory {
  id: string
  name: string
  icon: string
}

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉']

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  { id: 'smileys', name: 'Smileys & Emotion', icon: '😀' },
  { id: 'people', name: 'People & Gestures', icon: '👋' },
  { id: 'hearts', name: 'Hearts & Celebration', icon: '❤️' },
  { id: 'objects', name: 'Work & Objects', icon: '💻' },
  { id: 'food', name: 'Food & Activities', icon: '☕' },
  { id: 'symbols', name: 'Symbols & Marks', icon: '✅' },
]

export const EMOJI_LIST: EmojiItem[] = [
  // ── Smileys & Emotion ─────────────────────────
  { emoji: '😀', name: 'Grinning Face', category: 'smileys', keywords: ['smile', 'happy', 'grin'] },
  { emoji: '😃', name: 'Smiling Face with Big Eyes', category: 'smileys', keywords: ['happy', 'joy', 'smile'] },
  { emoji: '😄', name: 'Smiling Face with Smiling Eyes', category: 'smileys', keywords: ['happy', 'laugh', 'pleased'] },
  { emoji: '😁', name: 'Beaming Face', category: 'smileys', keywords: ['teeth', 'grin', 'cheerful'] },
  { emoji: '😆', name: 'Grinning Squinting Face', category: 'smileys', keywords: ['laugh', 'lol', 'haha'] },
  { emoji: '😅', name: 'Sweat Smile', category: 'smileys', keywords: ['relief', 'nervous', 'whew'] },
  { emoji: '😂', name: 'Face with Tears of Joy', category: 'smileys', keywords: ['joy', 'crying', 'lol', 'lmao', 'haha'] },
  { emoji: '🤣', name: 'Rolling on the Floor Laughing', category: 'smileys', keywords: ['rofl', 'laugh', 'hilarious'] },
  { emoji: '🥹', name: 'Face Holding Back Tears', category: 'smileys', keywords: ['touched', 'grateful', 'proud', 'teary'] },
  { emoji: '😊', name: 'Smiling Face with Smiling Eyes', category: 'smileys', keywords: ['blush', 'warm', 'happy'] },
  { emoji: '😇', name: 'Smiling Face with Halo', category: 'smileys', keywords: ['angel', 'innocent', 'good'] },
  { emoji: '🙂', name: 'Slightly Smiling Face', category: 'smileys', keywords: ['okay', 'fine', 'smile'] },
  { emoji: '🙃', name: 'Upside-Down Face', category: 'smileys', keywords: ['sarcasm', 'irony', 'playful'] },
  { emoji: '😉', name: 'Winking Face', category: 'smileys', keywords: ['wink', 'flirt', 'joke'] },
  { emoji: '😌', name: 'Relieved Face', category: 'smileys', keywords: ['peace', 'calm', 'whew'] },
  { emoji: '😍', name: 'Heart Eyes', category: 'smileys', keywords: ['love', 'crush', 'adoring'] },
  { emoji: '🥰', name: 'Smiling Face with Hearts', category: 'smileys', keywords: ['in love', 'affection', 'fond'] },
  { emoji: '😘', name: 'Face Blowing a Kiss', category: 'smileys', keywords: ['kiss', 'love', 'sweet'] },
  { emoji: '😋', name: 'Yum', category: 'smileys', keywords: ['delicious', 'tasty', 'silly'] },
  { emoji: '😛', name: 'Face with Tongue', category: 'smileys', keywords: ['playful', 'joke'] },
  { emoji: '😜', name: 'Winking Face with Tongue', category: 'smileys', keywords: ['kidding', 'crazy', 'joke'] },
  { emoji: '🤪', name: 'Zany Face', category: 'smileys', keywords: ['goofy', 'wild', 'crazy'] },
  { emoji: '😎', name: 'Smiling Face with Sunglasses', category: 'smileys', keywords: ['cool', 'chill', 'slick'] },
  { emoji: '🤓', name: 'Nerd Face', category: 'smileys', keywords: ['geek', 'smart', 'code', 'study'] },
  { emoji: '🧐', name: 'Face with Monocle', category: 'smileys', keywords: ['investigate', 'curious', 'hmm'] },
  { emoji: '🥳', name: 'Partying Face', category: 'smileys', keywords: ['celebrate', 'birthday', 'woohoo'] },
  { emoji: '😏', name: 'Smirking Face', category: 'smileys', keywords: ['smirk', 'cheeky', 'flirt'] },
  { emoji: '😒', name: 'Unamused Face', category: 'smileys', keywords: ['meh', 'annoyed', 'displeased'] },
  { emoji: '😞', name: 'Disappointed Face', category: 'smileys', keywords: ['sad', 'bummed', 'unhappy'] },
  { emoji: '😔', name: 'Pensive Face', category: 'smileys', keywords: ['thoughtful', 'regret', 'somber'] },
  { emoji: '😟', name: 'Worried Face', category: 'smileys', keywords: ['concern', 'nervous', 'anxious'] },
  { emoji: '😕', name: 'Confused Face', category: 'smileys', keywords: ['puzzled', 'uncertain', 'what'] },
  { emoji: '🙁', name: 'Slightly Frowning Face', category: 'smileys', keywords: ['frown', 'sad'] },
  { emoji: '😣', name: 'Persevering Face', category: 'smileys', keywords: ['struggle', 'tough', 'endure'] },
  { emoji: '😫', name: 'Tired Face', category: 'smileys', keywords: ['exhausted', 'done', 'stressed'] },
  { emoji: '🥺', name: 'Pleading Face', category: 'smileys', keywords: ['puppy eyes', 'please', 'begging'] },
  { emoji: '😢', name: 'Crying Face', category: 'smileys', keywords: ['tear', 'sad', 'heartbreak'] },
  { emoji: '😭', name: 'Loudly Crying Face', category: 'smileys', keywords: ['sob', 'tears', 'crying', 'sad'] },
  { emoji: '😤', name: 'Face with Steam from Nose', category: 'smileys', keywords: ['determined', 'proud', 'triumph'] },
  { emoji: '😠', name: 'Angry Face', category: 'smileys', keywords: ['mad', 'annoyed', 'irritated'] },
  { emoji: '😡', name: 'Pouting Face', category: 'smileys', keywords: ['rage', 'furious', 'red'] },
  { emoji: '🤯', name: 'Exploding Head', category: 'smileys', keywords: ['mind blown', 'shocked', 'whoa'] },
  { emoji: '😳', name: 'Flushed Face', category: 'smileys', keywords: ['dazed', 'embarrassed', 'blush'] },
  { emoji: '🥵', name: 'Hot Face', category: 'smileys', keywords: ['heat', 'sweat', 'summer'] },
  { emoji: '🥶', name: 'Cold Face', category: 'smileys', keywords: ['freezing', 'ice', 'chilly'] },
  { emoji: '😱', name: 'Face Screaming in Fear', category: 'smileys', keywords: ['horror', 'scared', 'shock'] },
  { emoji: '🤔', name: 'Thinking Face', category: 'smileys', keywords: ['ponder', 'consider', 'hmm'] },
  { emoji: '🫡', name: 'Saluting Face', category: 'smileys', keywords: ['respect', 'yes sir', 'roger', 'salute'] },
  { emoji: '🤗', name: 'Hugging Face', category: 'smileys', keywords: ['hug', 'warm', 'welcome'] },
  { emoji: '🤫', name: 'Shushing Face', category: 'smileys', keywords: ['quiet', 'secret', 'hush'] },
  { emoji: '🤐', name: 'Zipper-Mouth Face', category: 'smileys', keywords: ['silent', 'sealed', 'secret'] },
  { emoji: '😴', name: 'Sleeping Face', category: 'smileys', keywords: ['sleep', 'zzz', 'night'] },

  // ── People & Gestures ─────────────────────────
  { emoji: '👍', name: 'Thumbs Up', category: 'people', keywords: ['thumbsup', 'like', 'approve', 'yes', 'ok'] },
  { emoji: '👎', name: 'Thumbs Down', category: 'people', keywords: ['dislike', 'no', 'disapprove'] },
  { emoji: '👌', name: 'OK Hand', category: 'people', keywords: ['perfect', 'agree', 'correct', 'ok'] },
  { emoji: '✌️', name: 'Victory Hand', category: 'people', keywords: ['peace', 'v', 'two'] },
  { emoji: '🤞', name: 'Crossed Fingers', category: 'people', keywords: ['luck', 'hopeful', 'wish'] },
  { emoji: '🤟', name: 'Love-You Gesture', category: 'people', keywords: ['ily', 'love', 'rock'] },
  { emoji: '🤘', name: 'Sign of the Horns', category: 'people', keywords: ['rock', 'metal', 'horns'] },
  { emoji: '🤙', name: 'Call Me Hand', category: 'people', keywords: ['shaka', 'call', 'hang loose'] },
  { emoji: '👈', name: 'Backhand Index Pointing Left', category: 'people', keywords: ['point', 'left', 'this'] },
  { emoji: '👉', name: 'Backhand Index Pointing Right', category: 'people', keywords: ['point', 'right', 'there'] },
  { emoji: '👆', name: 'Backhand Index Pointing Up', category: 'people', keywords: ['point', 'up', 'above'] },
  { emoji: '👇', name: 'Backhand Index Pointing Down', category: 'people', keywords: ['point', 'down', 'below'] },
  { emoji: '☝️', name: 'Index Pointing Up', category: 'people', keywords: ['one', 'first', 'attention'] },
  { emoji: '👋', name: 'Waving Hand', category: 'people', keywords: ['hello', 'bye', 'wave', 'hi'] },
  { emoji: '🤚', name: 'Raised Back of Hand', category: 'people', keywords: ['hand', 'stop'] },
  { emoji: '✋', name: 'Raised Hand', category: 'people', keywords: ['high five', 'stop', 'hand'] },
  { emoji: '🖖', name: 'Vulcan Salute', category: 'people', keywords: ['spock', 'star trek', 'live long'] },
  { emoji: '👏', name: 'Clapping Hands', category: 'people', keywords: ['applause', 'praise', 'bravo', 'clap'] },
  { emoji: '🙌', name: 'Raising Hands', category: 'people', keywords: ['celebrate', 'hooray', 'yay', 'hands'] },
  { emoji: '👐', name: 'Open Hands', category: 'people', keywords: ['open', 'hug', 'welcome'] },
  { emoji: '🤲', name: 'Palms Up Together', category: 'people', keywords: ['prayer', 'offering', 'hope'] },
  { emoji: '🤝', name: 'Handshake', category: 'people', keywords: ['deal', 'agreement', 'partner', 'meet'] },
  { emoji: '🙏', name: 'Folded Hands', category: 'people', keywords: ['please', 'thank you', 'thanks', 'pray'] },
  { emoji: '✍️', name: 'Writing Hand', category: 'people', keywords: ['note', 'writing', 'sign'] },
  { emoji: '💪', name: 'Flexed Biceps', category: 'people', keywords: ['strong', 'power', 'muscle', 'workout'] },
  { emoji: '👀', name: 'Eyes', category: 'people', keywords: ['look', 'see', 'watch', 'curious'] },
  { emoji: '🧠', name: 'Brain', category: 'people', keywords: ['smart', 'intellect', 'think'] },
  { emoji: '🗣️', name: 'Speaking Head', category: 'people', keywords: ['talk', 'voice', 'speak'] },
  { emoji: '👤', name: 'Bust in Silhouette', category: 'people', keywords: ['user', 'person', 'profile'] },
  { emoji: '👥', name: 'Busts in Silhouette', category: 'people', keywords: ['team', 'users', 'group', 'members'] },
  { emoji: '🧑‍💻', name: 'Technologist', category: 'people', keywords: ['coder', 'developer', 'software', 'laptop'] },

  // ── Hearts & Celebration ──────────────────────
  { emoji: '❤️', name: 'Red Heart', category: 'hearts', keywords: ['love', 'heart', 'like'] },
  { emoji: '🧡', name: 'Orange Heart', category: 'hearts', keywords: ['love', 'orange'] },
  { emoji: '💛', name: 'Yellow Heart', category: 'hearts', keywords: ['love', 'friendship', 'yellow'] },
  { emoji: '💚', name: 'Green Heart', category: 'hearts', keywords: ['love', 'nature', 'green'] },
  { emoji: '💙', name: 'Blue Heart', category: 'hearts', keywords: ['love', 'trust', 'blue'] },
  { emoji: '💜', name: 'Purple Heart', category: 'hearts', keywords: ['love', 'purple'] },
  { emoji: '🖤', name: 'Black Heart', category: 'hearts', keywords: ['dark', 'black', 'goth'] },
  { emoji: '🤍', name: 'White Heart', category: 'hearts', keywords: ['pure', 'white', 'peace'] },
  { emoji: '💔', name: 'Broken Heart', category: 'hearts', keywords: ['breakup', 'sad', 'heartbreak'] },
  { emoji: '❤️‍🔥', name: 'Heart on Fire', category: 'hearts', keywords: ['passion', 'burning love', 'hot'] },
  { emoji: '✨', name: 'Sparkles', category: 'hearts', keywords: ['shiny', 'magic', 'special', 'clean', 'new'] },
  { emoji: '⭐', name: 'Star', category: 'hearts', keywords: ['favorite', 'rating', 'star'] },
  { emoji: '🌟', name: 'Glowing Star', category: 'hearts', keywords: ['bright', 'shine', 'glow'] },
  { emoji: '💫', name: 'Dizzy Symbol', category: 'hearts', keywords: ['sparkle', 'shooting star', 'dizzy'] },
  { emoji: '💥', name: 'Collision', category: 'hearts', keywords: ['boom', 'explode', 'impact', 'bang'] },
  { emoji: '🔥', name: 'Fire', category: 'hearts', keywords: ['lit', 'hot', 'flame', 'trending'] },
  { emoji: '💯', name: 'Hundred Points', category: 'hearts', keywords: ['perfect', 'score', '100', 'full'] },
  { emoji: '🎉', name: 'Party Popper', category: 'hearts', keywords: ['tada', 'congrats', 'celebrate', 'party'] },
  { emoji: '🎊', name: 'Confetti Ball', category: 'hearts', keywords: ['celebration', 'festival', 'cheer'] },
  { emoji: '🎈', name: 'Balloon', category: 'hearts', keywords: ['celebration', 'party', 'birthday'] },
  { emoji: '🎂', name: 'Birthday Cake', category: 'hearts', keywords: ['cake', 'bday', 'party'] },
  { emoji: '🎁', name: 'Wrapped Gift', category: 'hearts', keywords: ['present', 'gift', 'box'] },
  { emoji: '🏆', name: 'Trophy', category: 'hearts', keywords: ['winner', 'champion', 'first', 'award'] },
  { emoji: '🥇', name: '1st Place Medal', category: 'hearts', keywords: ['gold', 'first', 'champion'] },
  { emoji: '🥈', name: '2nd Place Medal', category: 'hearts', keywords: ['silver', 'second'] },
  { emoji: '🥉', name: '3rd Place Medal', category: 'hearts', keywords: ['bronze', 'third'] },

  // ── Work & Objects ────────────────────────────
  { emoji: '💼', name: 'Briefcase', category: 'objects', keywords: ['work', 'business', 'job', 'office'] },
  { emoji: '📁', name: 'File Folder', category: 'objects', keywords: ['documents', 'files', 'directory'] },
  { emoji: '📂', name: 'Open File Folder', category: 'objects', keywords: ['folder', 'browse', 'files'] },
  { emoji: '📄', name: 'Page Facing Up', category: 'objects', keywords: ['document', 'paper', 'text'] },
  { emoji: '📋', name: 'Clipboard', category: 'objects', keywords: ['tasks', 'checklist', 'copy'] },
  { emoji: '📊', name: 'Bar Chart', category: 'objects', keywords: ['stats', 'metrics', 'analytics', 'graph'] },
  { emoji: '📈', name: 'Chart Increasing', category: 'objects', keywords: ['growth', 'profit', 'sales', 'up'] },
  { emoji: '📉', name: 'Chart Decreasing', category: 'objects', keywords: ['drop', 'down', 'decline'] },
  { emoji: '📌', name: 'Pushpin', category: 'objects', keywords: ['pin', 'important', 'notice'] },
  { emoji: '📍', name: 'Round Pushpin', category: 'objects', keywords: ['location', 'place', 'marker'] },
  { emoji: '📎', name: 'Paperclip', category: 'objects', keywords: ['attach', 'attachment', 'link'] },
  { emoji: '💻', name: 'Laptop', category: 'objects', keywords: ['computer', 'pc', 'mac', 'code', 'work'] },
  { emoji: '🖥️', name: 'Desktop Computer', category: 'objects', keywords: ['monitor', 'screen', 'desktop'] },
  { emoji: '📱', name: 'Mobile Phone', category: 'objects', keywords: ['iphone', 'smartphone', 'call'] },
  { emoji: '☎️', name: 'Telephone', category: 'objects', keywords: ['phone', 'dial', 'ring'] },
  { emoji: '⏰', name: 'Alarm Clock', category: 'objects', keywords: ['time', 'wake', 'urgent'] },
  { emoji: '⏱️', name: 'Stopwatch', category: 'objects', keywords: ['timer', 'fast', 'quick'] },
  { emoji: '📅', name: 'Calendar', category: 'objects', keywords: ['date', 'schedule', 'event'] },
  { emoji: '🗓️', name: 'Spiral Calendar', category: 'objects', keywords: ['planner', 'month', 'agenda'] },
  { emoji: '💡', name: 'Light Bulb', category: 'objects', keywords: ['idea', 'insight', 'bright', 'tip'] },
  { emoji: '🔍', name: 'Magnifying Glass Left', category: 'objects', keywords: ['search', 'find', 'explore'] },
  { emoji: '🔎', name: 'Magnifying Glass Right', category: 'objects', keywords: ['search', 'inspect'] },
  { emoji: '🔒', name: 'Locked', category: 'objects', keywords: ['secure', 'private', 'lock', 'safe'] },
  { emoji: '🔓', name: 'Unlocked', category: 'objects', keywords: ['open', 'public', 'access'] },
  { emoji: '🔑', name: 'Key', category: 'objects', keywords: ['password', 'secret', 'access'] },
  { emoji: '✉️', name: 'Envelope', category: 'objects', keywords: ['email', 'mail', 'message', 'letter'] },
  { emoji: '📩', name: 'Envelope with Arrow', category: 'objects', keywords: ['inbox', 'received', 'sent'] },
  { emoji: '📦', name: 'Package', category: 'objects', keywords: ['delivery', 'box', 'shipping'] },
  { emoji: '🏷️', name: 'Label', category: 'objects', keywords: ['tag', 'price', 'category'] },
  { emoji: '💰', name: 'Money Bag', category: 'objects', keywords: ['cash', 'revenue', 'dollar', 'deal'] },
  { emoji: '💳', name: 'Credit Card', category: 'objects', keywords: ['payment', 'billing', 'finance'] },
  { emoji: '📝', name: 'Memo', category: 'objects', keywords: ['note', 'write', 'draft'] },

  // ── Food & Activities ─────────────────────────
  { emoji: '☕', name: 'Hot Beverage', category: 'food', keywords: ['coffee', 'tea', 'cafe', 'morning'] },
  { emoji: '🍵', name: 'Teacup Without Handle', category: 'food', keywords: ['green tea', 'matcha'] },
  { emoji: '🥤', name: 'Cup with Straw', category: 'food', keywords: ['soda', 'drink', 'smoothie'] },
  { emoji: '🍺', name: 'Beer Mug', category: 'food', keywords: ['drink', 'cheers', 'beer'] },
  { emoji: '🍻', name: 'Clinking Beer Mugs', category: 'food', keywords: ['cheers', 'celebrate', 'party'] },
  { emoji: '🥂', name: 'Clinking Glasses', category: 'food', keywords: ['champagne', 'toast', 'celebrate'] },
  { emoji: '🍕', name: 'Pizza', category: 'food', keywords: ['slice', 'cheese', 'italian'] },
  { emoji: '🍔', name: 'Hamburger', category: 'food', keywords: ['burger', 'fast food'] },
  { emoji: '🍟', name: 'French Fries', category: 'food', keywords: ['fries', 'snack'] },
  { emoji: '🌮', name: 'Taco', category: 'food', keywords: ['mexican', 'food'] },
  { emoji: '🥪', name: 'Sandwich', category: 'food', keywords: ['lunch', 'snack'] },
  { emoji: '🍿', name: 'Popcorn', category: 'food', keywords: ['movie', 'snack', 'watch'] },
  { emoji: '🍩', name: 'Doughnut', category: 'food', keywords: ['donut', 'sweet'] },
  { emoji: '🍪', name: 'Cookie', category: 'food', keywords: ['biscuit', 'sweet', 'treat'] },
  { emoji: '🚀', name: 'Rocket', category: 'food', keywords: ['launch', 'ship', 'fast', 'blast', 'deploy'] },
  { emoji: '✈️', name: 'Airplane', category: 'food', keywords: ['flight', 'travel', 'trip'] },
  { emoji: '🚗', name: 'Automobile', category: 'food', keywords: ['car', 'drive', 'travel'] },
  { emoji: '🎯', name: 'Direct Hit', category: 'food', keywords: ['target', 'goal', 'bullseye', 'exact'] },
  { emoji: '🎲', name: 'Game Die', category: 'food', keywords: ['dice', 'luck', 'chance'] },
  { emoji: '🎮', name: 'Video Game', category: 'food', keywords: ['gaming', 'play', 'controller'] },
  { emoji: '🎧', name: 'Headphone', category: 'food', keywords: ['music', 'audio', 'listen'] },
  { emoji: '🎵', name: 'Musical Note', category: 'food', keywords: ['song', 'melody', 'tune'] },

  // ── Symbols & Marks ───────────────────────────
  { emoji: '✅', name: 'Check Mark Button', category: 'symbols', keywords: ['done', 'yes', 'verified', 'approved', 'complete'] },
  { emoji: '✔️', name: 'Check Mark', category: 'symbols', keywords: ['ok', 'yes', 'done'] },
  { emoji: '☑️', name: 'Check Box with Check', category: 'symbols', keywords: ['task', 'done', 'voted'] },
  { emoji: '❌', name: 'Cross Mark', category: 'symbols', keywords: ['no', 'cancel', 'failed', 'wrong', 'reject'] },
  { emoji: '❎', name: 'Cross Mark Button', category: 'symbols', keywords: ['no', 'delete'] },
  { emoji: '❓', name: 'Question Mark', category: 'symbols', keywords: ['what', 'help', 'ask'] },
  { emoji: '❗', name: 'Exclamation Mark', category: 'symbols', keywords: ['alert', 'important', 'warning'] },
  { emoji: '⚠️', name: 'Warning', category: 'symbols', keywords: ['caution', 'danger', 'alert', 'notice'] },
  { emoji: '🚫', name: 'Prohibited', category: 'symbols', keywords: ['forbidden', 'stop', 'blocked'] },
  { emoji: '⛔', name: 'No Entry', category: 'symbols', keywords: ['access denied', 'stop'] },
  { emoji: 'ℹ️', name: 'Information', category: 'symbols', keywords: ['info', 'details', 'help'] },
  { emoji: '🆗', name: 'OK Button', category: 'symbols', keywords: ['agree', 'okay'] },
  { emoji: '🆙', name: 'UP! Button', category: 'symbols', keywords: ['upgrade', 'boost'] },
  { emoji: '🆕', name: 'NEW Button', category: 'symbols', keywords: ['fresh', 'recent'] },
  { emoji: '🆓', name: 'FREE Button', category: 'symbols', keywords: ['zero', 'gift'] },
  { emoji: '🌐', name: 'Globe with Meridians', category: 'symbols', keywords: ['internet', 'world', 'web', 'global'] },
  { emoji: '🔔', name: 'Bell', category: 'symbols', keywords: ['notification', 'alert', 'ring'] },
  { emoji: '🔕', name: 'Bell with Slash', category: 'symbols', keywords: ['mute', 'silent', 'dnd'] },
  { emoji: '🚩', name: 'Triangular Flag', category: 'symbols', keywords: ['flag', 'mark', 'priority'] },
  { emoji: '⚡', name: 'High Voltage', category: 'symbols', keywords: ['fast', 'electric', 'lightning', 'energy'] },
]

/**
 * Checks whether a message consists exclusively of emojis (ignoring whitespace).
 * Returns isOnly boolean and total count of emojis.
 */
export function isEmojiOnly(text: string): { isOnly: boolean; count: number } {
  const trimmed = text.trim()
  if (!trimmed) return { isOnly: false, count: 0 }

  // Regex matching complete individual emoji sequences (including ZWJ, skin tones, variation selectors, keycaps, flags)
  const emojiRegex = /(?:\p{Extended_Pictographic}(?:[\uFE0F\u{1F3FB}-\u{1F3FF}]|(?:\u200D(?:\uFE0F)?\p{Extended_Pictographic}))*)|[0-9#*]\uFE0F?\u20E3|[\u{1F1E6}-\u{1F1FF}]{2}/gu

  const matches = trimmed.match(emojiRegex)
  if (!matches) return { isOnly: false, count: 0 }

  // Check if replacing all emojis and spaces leaves an empty string
  const remainder = trimmed.replace(emojiRegex, '').replace(/\s+/g, '')
  if (remainder.length === 0) {
    return { isOnly: true, count: matches.length }
  }

  return { isOnly: false, count: matches.length }
}
