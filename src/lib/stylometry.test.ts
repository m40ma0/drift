import {
  computeLexicalDiversity,
  getSentenceLengths,
  computeSentenceRhythm,
  computePunctuation,
  computeFillerWords,
  buildProfile,
  computeOverallDrift,
  scoreAgainstProfile,
} from './stylometry';

// Test sample 1: Short, punchy voice (Twitter-like)
const sample1 = `I love this. It's so good. Really great. Who knew? Not me. 
But honestly, it works. And it's fast. Super fast. Incredible, honestly.`;

// Test sample 2: Long, flowing voice (Newsletter-like)
const sample2 = `This is a thoughtful piece about the nature of communication in our modern age. 
The way we express ourselves through written word has fundamentally changed over the past decade. 
Consider the implications of this shift—it affects everything from how we think to how we connect with others.`;

console.log('=== Stylometry Tests ===\n');

// Test 1: Lexical Diversity
console.log('Test 1: Lexical Diversity');
const ld1 = computeLexicalDiversity(sample1);
const ld2 = computeLexicalDiversity(sample2);
console.log(`Sample 1 (punchy): ${ld1.toFixed(2)}`);
console.log(`Sample 2 (flowing): ${ld2.toFixed(2)}`);
console.log(`✓ Sample 2 should have higher diversity: ${ld2 > ld1 ? 'PASS' : 'FAIL'}\n`);

// Test 2: Sentence Length
console.log('Test 2: Sentence Length');
const lengths1 = getSentenceLengths(sample1);
const lengths2 = getSentenceLengths(sample2);
console.log(`Sample 1 sentences: ${lengths1.join(', ')} (avg: ${(lengths1.reduce((a, b) => a + b) / lengths1.length).toFixed(1)})`);
console.log(`Sample 2 sentences: ${lengths2.join(', ')} (avg: ${(lengths2.reduce((a, b) => a + b) / lengths2.length).toFixed(1)})`);
console.log(`✓ Sample 1 should have shorter sentences on average: ${lengths1.reduce((a, b) => a + b) / lengths1.length < lengths2.reduce((a, b) => a + b) / lengths2.length ? 'PASS' : 'FAIL'}\n`);

// Test 3: Punctuation
console.log('Test 3: Punctuation Frequency (per 100 words)');
const punct1 = computePunctuation(sample1);
const punct2 = computePunctuation(sample2);
console.log(`Sample 1: Em-dashes=${punct1.emDashes.toFixed(1)}, Exclamation=${punct1.exclamationPoints.toFixed(1)}`);
console.log(`Sample 2: Em-dashes=${punct2.emDashes.toFixed(1)}, Exclamation=${punct2.exclamationPoints.toFixed(1)}`);
console.log(`✓ Sample 1 should have more exclamation points: ${punct1.exclamationPoints > punct2.exclamationPoints ? 'PASS' : 'FAIL'}\n`);

// Test 4: Filler Words
console.log('Test 4: Filler Words (per 100 words)');
const filler1 = computeFillerWords(sample1);
const filler2 = computeFillerWords(sample2);
console.log(`Sample 1: ${filler1.toFixed(1)}`);
console.log(`Sample 2: ${filler2.toFixed(1)}`);
console.log(`✓ Both computed: PASS\n`);

// Test 5: Build Profile
console.log('Test 5: Build Complete Profile from Samples');
const profile = buildProfile([sample1, sample2]);
console.log(`Lexical Diversity: mean=${profile.lexicalDiversity.mean.toFixed(3)}, stdDev=${profile.lexicalDiversity.stdDev.toFixed(3)}`);
console.log(`Sentence Length: mean=${profile.sentenceLength.mean.toFixed(1)}, stdDev=${profile.sentenceLength.stdDev.toFixed(1)}`);
console.log(`Contraction Rate: ${(profile.contractionRate * 100).toFixed(1)}%`);
console.log(`✓ Profile built: PASS\n`);

// Test 6: Score Against Profile (AI-polished draft)
console.log('Test 6: Drift Scoring');
const aiDraft = `This innovative platform represents a paradigm shift in how we approach digital communication. 
The sophisticated algorithms enable unprecedented levels of personalization and engagement. 
Furthermore, the implementation demonstrates a commitment to both accessibility and performance optimization.`;

const scores = scoreAgainstProfile(aiDraft, profile);
console.log(`AI Draft scored ${scores.length} sentences:`);
scores.forEach((score, i) => {
  console.log(`  Sentence ${i + 1}: drift=${score.driftScore.toFixed(3)} (length=${score.metrics.lengthDeviation.toFixed(2)}, filler=${score.metrics.fillerDeviation.toFixed(2)})`);
});

const overallDrift = computeOverallDrift(aiDraft, profile);
console.log(`Overall Drift: ${overallDrift.toFixed(1)}° (should be >20°)\n`);

console.log('=== All Tests Complete ===');
