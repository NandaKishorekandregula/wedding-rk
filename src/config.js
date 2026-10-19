export const config = {
  groom: { name: 'Aarav', about: 'A gentle soul who finds peace in music and prayer.', parents: 'Son of Mr. & Mrs. Sharma' },
  bride: { name: 'Ananya', about: 'Graceful, joyful and devoted to family and tradition.', parents: 'Daughter of Mr. & Mrs. Rao' },
  date: 'Friday, 12 February 2027',
  introBlessing: 'With the blessings of Lord Ganesha',        // first screen, over the garden
  heroBlessing: 'With the blessings of Shri Radha Krishna',   // second screen
  blessing: 'Where there is Radha, there is Krishna, and where there is love, there is their blessing.',
  message: 'With the grace of Shri Radha Krishna, we joyfully invite you to bless us on the beginning of our journey together.',

  // the two hanging peacock feathers: label = text under the feather, title = heading in the opened panel
  ceremonies: [
    { label: 'Haldi', title: 'Haldi & Mehendi', events: [
      { name: 'Haldi', date: '10 Feb 2027', time: '10:00 AM', venue: 'Family Residence', note: 'Wear yellow, and come ready to play!' },
      { name: 'Mehendi', date: '10 Feb 2027', time: '4:00 PM', venue: 'Family Residence' },
    ] },
    { label: 'Sangeet', title: 'Sangeet Night', events: [
      { name: 'Sangeet', date: '11 Feb 2027', time: '7:00 PM', venue: 'Your Venue Name', note: 'An evening of music and dance' },
    ] },
  ],
  // shown in the Venue card
  mainEvents: [
    { name: 'Wedding', date: '12 Feb 2027', time: '9:30 AM' },
    { name: 'Reception', date: '12 Feb 2027', time: '7:30 PM' },
  ],

  venue: { name: 'Your Venue Name', address: 'Street, City, State', mapUrl: 'https://maps.google.com/?q=Your+Venue+Name' },
  families: 'With love, the Sharma & Rao families',
  music: '/assets/music.mp3',
};