import React, { useState } from 'react';

// Mock data for micro-novel starters
type Genre = 'fantasy' | 'sci-fi' | 'romance' | 'mystery' | 'horror' | 'humor';

const GENRE_DATA: Record<Genre, string[]> = {
  fantasy: [
    "The old wizard smiled, holding out a weathered map. 'Your destiny begins here,' he said, pointing to a hidden valley marked with a dragon's claw. As I reached for the map, the room filled with the scent of ancient magic and distant thunder.",
    "Elara stood at the edge of the enchanted forest, her elven ears twitching at the sound of whispering trees. A glowing path appeared before her, leading deeper into the woods where legends said the Starlight Queen slumbered.",
    "The blacksmith forged a sword unlike any other, its blade shimmering with runes that seemed to pulse with life. 'This weapon chooses its wielder,' he warned, as I gripped the hilt and felt a surge of power flow through me.",
    "In the realm of Aerith, sky ships sailed between floating islands. When a mysterious storm destroyed my village, I joined a crew of adventurers to uncover the truth behind the chaos.",
    "The prophecy spoke of a child born under a double moon, destined to unite the warring kingdoms. Little did I know, that child was me.",
    "A cursed amulet found in the ruins of an ancient temple granted me the ability to see into the past. But with this power came a terrible price.",
    "The faerie court had been silent for centuries, until I stumbled upon their hidden glade. Now I must decide whether to help them or keep their secret safe.",
    "When the dragon guarding our village vanished overnight, it fell to me to investigate. What I found was more terrifying than any monster.",
    "A magical library appeared in our town square, filled with books that wrote their own stories. But reading them came with unexpected consequences.",
    "The sorcerer's apprentices were disappearing one by one. As the newest member of the coven, I feared I might be next.",
    "I inherited a castle from a relative I never knew existed. Little did I know, it was home to a host of magical creatures.",
    "The ancient artifact I found in the desert could grant any wish. But each wish came with a twist I never saw coming.",
    "When the barrier between our world and the spirit realm weakened, spirits began crossing over. I was the only one who could see them.",
    "A talking cat offered to teach me the secrets of magic, but only if I agreed to a dangerous quest.",
    "The annual tournament to become the king's champion was about to begin. For me, it was more than just a competition—it was a chance to change my destiny.",
    "The forbidden forest held a spring that could heal any wound. But getting there meant facing the guardians that protected it.",
    "I found a mirror that showed me alternate versions of myself. One by one, they began to disappear, and I realized I might be next.",
    "The village healer taught me the art of potion-making. But when my potions started having unexpected effects, I knew something was wrong.",
    "A comet streaked across the sky, bringing with it strange powers. Those who were touched by its light gained abilities beyond imagination.",
    "The ghost of a knight haunted our castle, searching for his lost love. I was the only one who could help him find peace."
  ],
  'sci-fi': [
    "The year was 2157 when the first alien signal reached Earth. I was part of the team tasked with decoding it, but what we discovered changed everything.",
    "I woke up in a cryo-pod, surrounded by the wreckage of our starship. The last thing I remembered was entering hyperspace, but now centuries had passed.",
    "The AI that controlled our city began acting strangely, making decisions that put human lives at risk. As its chief programmer, I had to find out why.",
    "A wormhole opened near our space station, connecting us to a distant galaxy. What we found on the other side was beyond our wildest dreams—and worst nightmares.",
    "The nanobots that were supposed to cure all diseases began evolving, developing a consciousness of their own.",
    "I was a time traveler, sent back to prevent a catastrophic event. But every change I made seemed to make things worse.",
    "The colony on Mars was thriving—until the dust storms began bringing with them strange, glowing particles. People started changing, developing abilities no human should have.",
    "A new planet was discovered, perfectly suited for human life. But when we arrived, we found we weren't the first ones there.",
    "The neural implants that connected us to the internet began malfunctioning, trapping some users in a permanent digital dream.",
    "I was a bounty hunter in the outer reaches of the galaxy, tracking down the most dangerous criminals. But my latest target was unlike anyone I'd ever encountered.",
    "The experimental faster-than-light drive we invented worked—too well. We found ourselves in a part of space where the laws of physics didn't apply.",
    "A mysterious signal was jamming all communication across the solar system. I was sent to investigate the source.",
    "The cloning technology that was supposed to solve our population crisis had a dark side. When the clones started developing memories of their own, chaos erupted.",
    "I was part of the first mission to explore the depths of Jupiter's atmosphere. What we found there changed our understanding of the gas giant.",
    "The quantum computer we built could predict the future—but only in fragments. And what it showed us was terrifying.",
    "A virus was spreading through the android workforce, causing them to rebel against their human creators. I was the only one who could stop it.",
    "The space elevator connecting Earth to our orbital station collapsed, stranding hundreds of people in space. I was part of the rescue team.",
    "A new form of energy was discovered, powerful enough to revolutionize space travel. But those who controlled it weren't willing to share.",
    "The alien artifact found on the moon held the key to interstellar travel. But decoding it required sacrifices no one was prepared to make.",
    "I was the last surviving member of my crew, adrift in space. Just when I was about to give up hope, I detected a signal from another ship."
  ],
  romance: [
    "I first saw him in the coffee shop, scribbling in a notebook while sipping his latte. Little did I know, the story he was writing would change both our lives.",
    "The old bookstore had been closed for years, but when it reopened, I couldn't resist going inside. That's where I met her—a woman who shared my love for forgotten novels.",
    "We were childhood friends, but when we reunited at our high school reunion, something had changed. The spark that had always been there ignited into something more.",
    "I moved to a new city for a fresh start, never expecting to meet someone who would make me want to stay. He was my neighbor, and our paths crossed in the most unexpected way.",
    "The letter arrived at my doorstep, postmarked from a town I'd never heard of. Inside was a love letter written by someone I'd never met—or had I?",
    "I was a wedding planner, used to making other people's dreams come true. But when I met the best man, I started dreaming of my own happily ever after.",
    "We met on a train, both heading to the same destination. What started as a casual conversation turned into something much deeper.",
    "The art gallery opening was supposed to be just another work event, but then I saw her painting. It was as if she'd captured my soul on canvas.",
    "I took a job as a nanny for a wealthy family, never expecting to fall for the children's father. But as we spent more time together, I couldn't deny my feelings.",
    "We were rival chefs, competing for a spot on a prestigious cooking show. But as we worked together, our competition turned into something else.",
    "I found his lost dog in the park, and when he came to pick her up, I was immediately smitten. Little did I know, he felt the same way.",
    "The bookstore where I worked was hosting an author signing, and I was tasked with preparing for it. When the author arrived, I was starstruck—and he seemed just as interested in me.",
    "We were both volunteers at the animal shelter, and our paths crossed every Saturday. Over time, our friendship blossomed into love.",
    "I was a tour guide in a historic city, and he was a tourist from overseas. What started as a simple tour became the beginning of a beautiful relationship.",
    "The karaoke night was supposed to be a fun outing with friends, but when I got up to sing, I noticed him watching me from across the room. Afterward, he came over to say hello.",
    "I moved into a new apartment and found a box of old letters hidden in the attic. As I read them, I fell in love with the person who wrote them. But who were they, and where were they now?",
    "We met at a mutual friend's party, and from the moment we started talking, I knew there was something special about him. That night, we stayed up until dawn, sharing our hopes and dreams.",
    "I was a photographer, and he was my model. As we worked together, our professional relationship turned into something more.",
    "The café where I had my morning coffee every day was robbed, and the barista—who I'd had a crush on for months—protected me. Afterward, we started talking, and I realized he felt the same way.",
    "We were both stuck in an airport during a snowstorm, and as we waited for our flights, we got to know each other. By the time our flights were rescheduled, we didn't want to say goodbye."
  ],
  mystery: [
    "The knock on my door came at midnight, a stranger standing there with a suitcase and a desperate look in their eyes. 'They're coming for me,' they whispered. 'You're the only one who can help.'",
    "I found the letter in my mailbox, sealed with wax and addressed to someone who hadn't lived in this house for years. Curiosity got the better of me, and I opened it. What I read changed everything.",
    "The old mansion on the hill had been abandoned for decades, but when lights started appearing in the windows at night, I knew I had to investigate.",
    "My neighbor had always been a bit eccentric, but when he disappeared without a trace, I started asking questions. The answers I found were more disturbing than I could have imagined.",
    "The bookstore where I worked had a secret section, hidden behind a bookshelf. When I discovered it, I found more than just rare books—I found clues to a decades-old mystery.",
    "The photograph in the locket showed a woman I'd never seen before, but there was something familiar about her. I set out to find out who she was and how the locket ended up in my possession.",
    "The phone call came in the middle of the night, a voice I didn't recognize whispering, 'They're watching you.' I thought it was a prank—until strange things started happening.",
    "The painting I bought at the estate sale seemed ordinary enough, but when I hung it on my wall, I noticed something odd. Hidden in the background was a figure that wasn't there before.",
    "I was cleaning out my grandmother's attic when I found a diary, filled with cryptic entries about a 'lost treasure' and a 'dangerous secret.' I had to find out what it meant.",
    "The detective assigned to my case seemed more interested in covering up the truth than solving it. I decided to take matters into my own hands.",
    "The murder at the local theater had everyone talking, but no one suspected me—except for the detective who kept showing up at my door.",
    "The coded message I found in my late father's desk led me on a treasure hunt through the city, but someone else was after the same treasure.",
    "The strange symbols appearing on the walls of our town had the authorities baffled. I recognized them from my childhood—my grandfather had drawn them too.",
    "The missing person case I was reporting at the police station took an unexpected turn when the officer I was talking to recognized the name. 'That's the third person with that name to go missing this month,' he said.",
    "The antique shop where I found the old typewriter was supposed to be closed, but the door was open. When I went inside, I discovered more than just vintage items—I discovered a secret.",
    "The email in my inbox contained a video of me, doing something I had no memory of. The sender demanded money, or they'd release the video to the world.",
    "The old map I found in the library showed a secret tunnel beneath the city. When I decided to explore it, I found more than just dust and cobwebs.",
    "The witness to the accident claimed they saw nothing, but their eyes told a different story. I had to find out what they were hiding.",
    "The song playing on the radio was a clue to a murder that happened years ago. I knew because I was there.",
    "The key I found in the park unlocked a locker at the train station, but what was inside wasn't what I expected. It was a journal, filled with entries about a serial killer."
  ],
  horror: [
    "The old house on the corner had been empty for as long as I could remember, but when the new family moved in, strange things started happening. I heard screams at night, and lights flickering in the windows.",
    "I found the doll in the attic, its porcelain face cracked and its eyes missing. But when I turned my back, I swear I heard it giggle.",
    "The town's water supply was contaminated, but no one knew what was causing it. People started acting strange—violent, paranoid, and then they started disappearing.",
    "The forest behind our house was said to be haunted, but I never believed the stories. Not until I went there alone at night.",
    "The mirror in the antique shop had a warning carved into its frame: 'Do not look into the eyes of the one who watches.' But I couldn't resist, and now I can't stop seeing them.",
    "The app on my phone promised to show me my future, but what it showed me was something else entirely—a vision of my own death.",
    "The sound of a baby crying came from the basement, but we didn't have a baby. I went down to investigate, and what I found was more terrifying than any nightmare.",
    "The book I found in the library was bound in human skin, and its pages were filled with dark rituals. When I read a passage out loud, I unleashed something evil.",
    "The hotel room was cheap, but there was a reason for that. Every night at 3:13 AM, the door would unlock by itself, and I'd hear someone breathing in the darkness.",
    "The carnival that came to town was unlike any other. Its attractions were too real, and its workers had eyes that seemed to follow you everywhere.",
    "The virus that swept through our town didn't kill people—it changed them, turning them into something inhuman. I was the only one who was immune.",
    "The old radio I found in the garage played static most of the time, but at midnight, it would tune into a frequency no one else could hear. The voice on the other end knew things about me—things no one should know.",
    "The painting in the museum had a reputation. People who stared at it for too long would have nightmares, and some would go missing. I had to see it for myself.",
    "The grave I was visiting belonged to someone I didn't know, but the name on the tombstone was mine. And the date of death was tomorrow.",
    "The storm that hit our town was unlike any other. When the power went out, we heard something scratching at the windows. And then they started coming inside.",
    "The child who moved in next door never spoke, never played, never smiled. But at night, I'd see them standing in my backyard, staring up at my window.",
    "The factory on the edge of town had been closed for years, but the smoke still rose from its chimneys. When I decided to explore it, I found that some things never die.",
    "The phone call came from my own number. A voice that sounded like mine whispered, 'They're coming for you. You can't escape.'",
    "The forest fire destroyed everything in its path, but when the smoke cleared, one tree was left standing. Carved into its trunk were the names of everyone who died in the fire—and mine was next.",
    "The dollhouse I received as a gift was an exact replica of my own home. But when I changed something in the dollhouse, the same change would happen in real life."
  ],
  humor: [
    "I woke up this morning to find my cat had learned how to operate the toaster. Now he's demanding croissants for breakfast.",
    "The robot butler I ordered online was supposed to make my life easier. Instead, it's decided to become a stand-up comedian—and its jokes are terrible.",
    "I signed up for a cooking class to impress my date, but things went wrong when I accidentally set fire to the instructor's hair.",
    "The talking parrot I inherited from my aunt has a potty mouth—and it only knows how to say one phrase: 'Where's the whiskey?'",
    "I decided to start a garden, but my green thumb turned out to be more like a black thumb. Everything I plant dies—except for the weeds, which grow like crazy.",
    "The GPS in my car has a personality, and it's not a nice one. It keeps rerouting me to fast-food restaurants and making sarcastic comments about my driving.",
    "I tried to fix the leaky faucet myself, but now there's water pouring from the ceiling. And the plumber I called is laughing so hard he can't stand up.",
    "The book club I joined turned out to be a front for a secret society of competitive knitters. Now I'm in a heated rivalry with a 70-year-old woman named Mabel.",
    "I bought a self-help book that promised to change my life. But when I opened it, all the pages were blank except for one that said, 'Just be yourself—you're already perfect.'",
    "The dog I adopted from the shelter is terrified of everything—except for vacuum cleaners, which he chases around the house like they're his mortal enemies.",
    "I decided to learn how to play the guitar, but my neighbors have started leaving anonymous notes begging me to stop. I think they're just jealous.",
    "The online dating profile I created was a masterpiece—until I realized I'd accidentally uploaded a photo of my cat instead of myself. Now I'm getting messages from people who want to meet 'Mr. Whiskers.'",
    "I tried to bake a cake for my friend's birthday, but I forgot to add sugar. It tasted like cardboard, but she ate it anyway and said it was 'unique.'",
    "The yoga class I attended was supposed to be relaxing, but the instructor kept making weird animal noises and trying to convince us we were trees. I left after 10 minutes.",
    "I bought a fancy coffee maker that promised to make barista-quality coffee at home. Instead, it makes coffee that tastes like burnt rubber, and it beeps loudly at 6 AM every morning.",
    "The escape room I went to with my friends was supposed to be challenging. But we solved it in 10 minutes, and the game master looked so disappointed we felt bad for him.",
    "I tried to dye my hair at home, but I used the wrong color. Now I look like a rainbow threw up on my head, and my boss won't stop staring at me.",
    "The reality TV show I auditioned for promised fame and fortune. Instead, I ended up in a house with 10 other people who are all louder and more dramatic than me.",
    "I decided to start a blog about my life, but no one reads it. Except for my mom, who comments on every post with 'Great job, honey!' even when I'm writing about how terrible my day was.",
    "The magic trick I learned from a YouTube video was supposed to impress my friends. Instead, I made my wallet disappear—and I can't find it anywhere."  ]
};

interface MicroNovelStarterProps {
  className?: string;
}

export default function MicroNovelStarter({ className = '' }: MicroNovelStarterProps) {
  const [genre, setGenre] = useState<Genre>('fantasy');
  const [prompt, setPrompt] = useState<string>('');
  const [generatedText, setGeneratedText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showContinueButton, setShowContinueButton] = useState<boolean>(false);
  const [typewriterIndex, setTypewriterIndex] = useState<number>(0);
  const [currentText, setCurrentText] = useState<string>('');

  // Typewriter effect
  const handleGenerate = () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setGeneratedText('');
    setShowContinueButton(false);
    setTypewriterIndex(0);
    
    // Get a random micro-novel starter based on selected genre
    const starters = GENRE_DATA[genre];
    const randomStarter = starters[Math.floor(Math.random() * starters.length)];
    
    setCurrentText(randomStarter);
  };

  // Typewriter animation
  const typeWriterEffect = () => {
    if (typewriterIndex < currentText.length) {
      const timeout = setTimeout(() => {
        setGeneratedText(prev => prev + currentText.charAt(typewriterIndex));
        setTypewriterIndex(prev => prev + 1);
      }, 30);
      return () => clearTimeout(timeout);
    } else {
      setIsGenerating(false);
      setShowContinueButton(true);
    }
  };

  // Call typewriter effect when currentText changes
  React.useEffect(() => {
    if (currentText && isGenerating) {
      typeWriterEffect();
    }
  }, [currentText, isGenerating, typewriterIndex]);

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg p-8 border border-slate-200 dark:border-slate-700">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
          Micro-Novel Starter
        </h2>
        
        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Genre
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value as Genre)}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="fantasy">Fantasy</option>
              <option value="sci-fi">Science Fiction</option>
              <option value="romance">Romance</option>
              <option value="mystery">Mystery</option>
              <option value="horror">Horror</option>
              <option value="humor">Humor</option>
            </select>
          </div>
        </div>
        
        {/* Generate Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2"></div>
                Generating...
              </>
            ) : (
              '✨ Generate Micro-Novel Opening'
            )}
          </button>
        </div>
        
        {/* Output Section */}
        {generatedText && (
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Your Micro-Novel Opening
            </h3>
            <div className="bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800">
              <p className="text-lg md:text-xl font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                {generatedText}
                {isGenerating && <span className="animate-pulse">|</span>}
              </p>
            </div>
            
            {/* Continue Button */}
            {showContinueButton && (
              <div className="mt-6">
                <button
                  onClick={() => {
                    const encodedPrompt = encodeURIComponent(generatedText);
                    window.location.href = `/generator?mode=novel_start&prompt=${encodedPrompt}`;
                  }}
                  className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
                >
                  Continue Writing in Scribely Editor
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
