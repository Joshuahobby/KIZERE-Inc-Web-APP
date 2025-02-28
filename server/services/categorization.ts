import natural from 'natural';
import stringSimilarity from 'string-similarity';
import { CategoryConfidence } from '@shared/schema';

// Singleton instance and initialization promise
let classifierInstance: natural.BayesClassifier | null = null;
let initializationPromise: Promise<natural.BayesClassifier> | null = null;

// Pre-defined categories with their training data
const categoryTrainingData = {
  'ELECTRONICS': [
    'phone', 'laptop', 'computer', 'tablet', 'charger', 'headphones',
    'electronic device', 'gadget', 'smart watch', 'camera'
  ],
  'DOCUMENTS': [
    'passport', 'id card', 'driver license', 'certificate', 'card',
    'document', 'identification', 'official paper', 'permit', 'visa'
  ],
  'ACCESSORIES': [
    'wallet', 'bag', 'purse', 'backpack', 'watch', 'jewelry',
    'glasses', 'sunglasses', 'key', 'umbrella'
  ],
  'CLOTHING': [
    'jacket', 'shirt', 'pants', 'dress', 'shoes', 'coat',
    'scarf', 'hat', 'clothing', 'garment'
  ]
};

// Initialize classifier asynchronously
async function initializeClassifier(): Promise<natural.BayesClassifier> {
  console.log('[Categorization] Starting async classifier initialization...');
  const startTime = Date.now();

  const classifier = new natural.BayesClassifier();

  // Train the classifier
  Object.entries(categoryTrainingData).forEach(([category, examples]) => {
    console.log(`[Categorization] Training category: ${category} with ${examples.length} examples`);
    examples.forEach(example => {
      classifier.addDocument(example.toLowerCase(), category);
    });
  });

  await new Promise(resolve => setTimeout(resolve, 0)); // Yield to event loop
  classifier.train();

  const trainingTime = Date.now() - startTime;
  console.log(`[Categorization] Classifier training completed in ${trainingTime}ms`);

  return classifier;
}

// Get or initialize classifier
async function getClassifier(): Promise<natural.BayesClassifier> {
  if (classifierInstance) {
    return classifierInstance;
  }

  if (!initializationPromise) {
    initializationPromise = initializeClassifier().then(classifier => {
      classifierInstance = classifier;
      return classifier;
    });
  }

  return initializationPromise;
}

function extractFeatures(text: string): Record<string, number> {
  console.log(`[Categorization] Extracting features from text: "${text.slice(0, 50)}..."`);
  const tokens = natural.PorterStemmer.tokenizeAndStem(text.toLowerCase());
  const features: Record<string, number> = {};

  // Word frequency
  tokens.forEach(token => {
    features[`word_${token}`] = (features[`word_${token}`] || 0) + 1;
  });

  // Text length features
  features.text_length = text.length;
  features.word_count = tokens.length;

  // Category similarity scores
  Object.entries(categoryTrainingData).forEach(([category, examples]) => {
    const maxSimilarity = Math.max(
      ...examples.map(example => 
        stringSimilarity.compareTwoStrings(text.toLowerCase(), example)
      )
    );
    features[`similarity_${category.toLowerCase()}`] = maxSimilarity;
  });

  console.log('[Categorization] Extracted features:', features);
  return features;
}

export async function categorizeItem(
  title: string,
  description: string
): Promise<{
  suggestedCategories: CategoryConfidence[];
  categoryFeatures: Record<string, number>;
}> {
  console.log(`[Categorization] Processing item - Title: "${title}", Description: "${description.slice(0, 50)}..."`);

  const startTime = Date.now();
  const combinedText = `${title} ${description}`;

  // Get classifier instance
  const classifier = await getClassifier();
  console.log(`[Categorization] Classifier retrieval took ${Date.now() - startTime}ms`);

  const featureStartTime = Date.now();
  const features = extractFeatures(combinedText);
  console.log(`[Categorization] Feature extraction took ${Date.now() - featureStartTime}ms`);

  const classificationStartTime = Date.now();
  const classifications = classifier.getClassifications(combinedText.toLowerCase());
  console.log(`[Categorization] Classification took ${Date.now() - classificationStartTime}ms`);

  // Convert classifications to our schema format
  const suggestedCategories: CategoryConfidence[] = classifications.map(c => ({
    category: c.label,
    confidence: c.value,
    features: {
      similarity: features[`similarity_${c.label.toLowerCase()}`] || 0,
      wordMatch: features[`word_${c.label.toLowerCase()}`] || 0
    }
  }));

  const processingTime = Date.now() - startTime;
  console.log(`[Categorization] Total processing took ${processingTime}ms. Results:`, {
    suggestedCategories: suggestedCategories.map(c => ({
      category: c.category,
      confidence: c.confidence
    }))
  });

  return {
    suggestedCategories: suggestedCategories.sort((a, b) => b.confidence - a.confidence),
    categoryFeatures: features
  };
}

// Monitor ML performance
export function recordMLMetrics(startTime: number, predictions: CategoryConfidence[]) {
  const processingTime = Date.now() - startTime;
  const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;

  const metrics = {
    processingTime,
    accuracy: avgConfidence,
    modelVersion: '1.0.0',
    features: {
      predictionCount: predictions.length,
      averageConfidence: avgConfidence,
      maxConfidence: Math.max(...predictions.map(p => p.confidence))
    }
  };

  console.log('[Categorization] ML Metrics:', metrics);
  return metrics;
}