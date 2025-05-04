import logging
import random
import os
import re
from typing import Dict, List, Any

# Add NLTK data download to prevent errors
try:
    import nltk
    # Download all required NLTK packages
    for package in ['punkt', 'stopwords', 'wordnet', 'omw-1.4']:
        try:
            nltk.download(package, quiet=True)
        except Exception as e:
            logger.warning(f"Could not download NLTK package {package}: {e}")
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import optional dependencies
try:
    from textblob import TextBlob
    TEXTBLOB_AVAILABLE = True
except ImportError:
    TEXTBLOB_AVAILABLE = False
    # Create a simple TextBlob stub
    class TextBlobSentence:
        def __init__(self):
            self.sentiment = type('obj', (object,), {'polarity': 0.0})
            
    class TextBlob:
        def __init__(self, text):
            self._text = text
            self._sentences = [TextBlobSentence()]
            
        @property
        def sentences(self):
            return self._sentences

# Try to load NLTK resources safely
def safe_nltk_tokenize(text):
    try:
        if NLTK_AVAILABLE:
            return nltk.sent_tokenize(text)
    except Exception as e:
        logger.warning(f"NLTK tokenization failed: {e}")
    # Fallback to simple sentence splitting
    return text.replace("!", ".").replace("?", ".").split(".")

class AdvancedFactCheckModel:
    def __init__(self):
        logger.info(f"Initializing AdvancedFactCheckModel (NLTK: {NLTK_AVAILABLE}, TextBlob: {TEXTBLOB_AVAILABLE})")
        
        # Red flags that may indicate misinformation
        self.red_flags = [
            # Absolutes and generalizations
            r'\ball\b', r'\bnever\b', r'\balways\b', r'\bevery\b', r'\bnone\b',
            # Emotional language
            r'\bshocking\b', r'\bamazing\b', r'\bunbelievable\b', r'\bterrifying\b',
            # Conspiracy terminology
            r'\bhidden\b', r'\bsecret\b', r'\bconspiracy\b', r'\btheory\b', r'\btruth\b',
            r'\bcover(ed)?\s*up\b', r'\bexposed\b', r'\brevealed\b',
            # Sensationalism
            r'\bbreaking\b', r'\balert\b', r'\bviral\b', r'\bsensational\b',
            # Authority undermining
            r'\bmainstream\s*media\b', r'\bmsm\b', r'\belite\b', r'\bdeep\s*state\b',
            # Scientific undermining
            r'\bso.called\b', r'\bpseudo\b', r'\balternative\s*facts\b'
        ]
        
        # Topics that often have misinformation
        self.controversial_topics = [
            r'\bvaccine\b', r'\b5g\b', r'\bcovid\b', r'\belection\b', r'\bfraud\b',
            r'\btrump\b', r'\bbiden\b', r'\bclimate\b', r'\bglobal\s*warming\b'
        ]
        
        # Logical inconsistency patterns
        self.inconsistency_pairs = [
            (r'\bproven\b', r'\balleged\b'),
            (r'\bfact\b', r'\btheory\b'),
            (r'\bconfirmed\b', r'\bspeculation\b'),
            (r'\bsafe\b', r'\bdangerous\b')
        ]
        
        # Topic-specific fact-checking sources
        self.topic_sources = {
            "health": ["https://www.who.int/", "https://www.cdc.gov/", "https://www.mayoclinic.org/"],
            "covid": ["https://www.who.int/emergencies/diseases/novel-coronavirus-2019", "https://www.cdc.gov/coronavirus/"],
            "vaccine": ["https://www.cdc.gov/vaccines/", "https://www.who.int/health-topics/vaccines-and-immunization"],
            "climate": ["https://climate.nasa.gov/", "https://www.ipcc.ch/", "https://www.noaa.gov/climate"],
            "election": ["https://www.usa.gov/voting", "https://www.eac.gov/", "https://www.fec.gov/"],
            "politics": ["https://www.politifact.com/", "https://www.factcheck.org/"]
        }
        
        # Default fact-checking sources
        self.default_sources = [
            "https://www.factcheck.org/",
            "https://www.snopes.com/",
            "https://www.politifact.com/"
        ]

    def analyze(self, text: str) -> Dict[str, Any]:
        """
        Analyze text for potential misinformation using rule-based techniques
        
        Args:
            text: The text content to analyze
            
        Returns:
            Dictionary with analysis results
        """
        try:
            # Validate input
            if not text or not isinstance(text, str):
                logger.warning("Invalid text input provided")
                return {
                    "label": "ERROR",
                    "confidence": 0.0,
                    "explanation": "Invalid text content provided for analysis.",
                    "sources": [],
                    "isFake": False
                }
            
            # Extract sentences
            if NLTK_AVAILABLE:
                try:
                    sentences = safe_nltk_tokenize(text)
                except Exception as e:
                    logger.warning(f"Error tokenizing sentences: {e}")
                    sentences = text.split('. ')
            else:
                sentences = text.split('. ')
                
            # Analyze sentiment if TextBlob is available
            if TEXTBLOB_AVAILABLE:
                blob = TextBlob(text)
                sentiments = [sentence.sentiment.polarity for sentence in blob.sentences]
                avg_sentiment = sum(sentiments) / max(1, len(sentiments))
                sentiment_extremity = sum(abs(s) for s in sentiments) / max(1, len(sentiments))
            else:
                avg_sentiment = 0
                sentiment_extremity = 0.3  # Default value
            
            # Count red flags
            red_flag_count = 0
            for pattern in self.red_flags:
                try:
                    matches = re.findall(pattern, text.lower())
                    red_flag_count += len(matches)
                except Exception:
                    pass
            
            # Count controversial topic mentions
            topic_count = 0
            detected_topics = set()
            for pattern in self.controversial_topics:
                try:
                    matches = re.findall(pattern, text.lower())
                    if matches:
                        # Extract the topic keyword without regex markers
                        topic_key = pattern.replace(r'\b', '').lower()
                        detected_topics.add(topic_key)
                    topic_count += len(matches)
                except Exception:
                    pass
            
            # Check for logical inconsistencies
            inconsistency_count = 0
            for pattern_pair in self.inconsistency_pairs:
                try:
                    first_matches = len(re.findall(pattern_pair[0], text.lower()))
                    second_matches = len(re.findall(pattern_pair[1], text.lower()))
                    if first_matches > 0 and second_matches > 0:
                        inconsistency_count += 1
                except Exception:
                    pass
            
            # Normalize by text length
            word_count = len(text.split())
            normalized_red_flags = min(1.0, red_flag_count / max(1, word_count / 40))
            normalized_topics = min(1.0, topic_count / max(1, word_count / 60))
            
            # Calculate credibility factors
            credibility_factors = {
                'language_patterns': max(0.1, 1.0 - normalized_red_flags),
                'sentiment_extremity': max(0.1, 1.0 - sentiment_extremity),
                'controversial_topics': max(0.3, 1.0 - (normalized_topics * 0.7)),
                'logical_consistency': max(0.3, 1.0 - (inconsistency_count * 0.15))
            }
            
            # Calculate weighted credibility score
            weights = {
                'language_patterns': 0.4,
                'sentiment_extremity': 0.2,
                'controversial_topics': 0.2,
                'logical_consistency': 0.2
            }
            
            credibility_score = sum(credibility_factors[k] * weights[k] for k in weights)
            
            # Normalize to 0.2-0.8 range (avoid extreme certainty)
            credibility_score = max(0.2, min(0.8, credibility_score))
            
            # Determine if content is likely fake
            is_fake = credibility_score < 0.5
            confidence = 1 - credibility_score if is_fake else credibility_score
            confidence_percent = int(confidence * 100)
            
            # Generate explanation based on factors
            explanation_parts = []
            if credibility_factors['language_patterns'] < 0.5:
                explanation_parts.append("uses language patterns often found in misleading content")
            if credibility_factors['sentiment_extremity'] < 0.5:
                explanation_parts.append("contains emotionally charged language")
            if credibility_factors['controversial_topics'] < 0.5:
                explanation_parts.append("discusses controversial topics without balanced viewpoints")
            if credibility_factors['logical_consistency'] < 0.5:
                explanation_parts.append("contains potentially contradictory statements")
            
            # Format explanation
            if explanation_parts:
                explanation_text = ", ".join(explanation_parts[:-1])
                if len(explanation_parts) > 1:
                    explanation_text += f", and {explanation_parts[-1]}"
                else:
                    explanation_text = explanation_parts[0]
                    
                if is_fake:
                    explanation = f"This content may contain misinformation ({confidence_percent}% confidence). It {explanation_text}."
                else:
                    explanation = f"This content appears relatively trustworthy ({confidence_percent}% confidence), though you should verify key claims. It {explanation_text}."
            else:
                if is_fake:
                    explanation = f"This content shows some characteristics of potentially misleading information ({confidence_percent}% confidence)."
                else:
                    explanation = f"This content appears to be generally reliable ({confidence_percent}% confidence)."
            
            # Generate relevant sources
            sources = self._get_sources_for_topics(detected_topics)
            
            # Return the analysis results
            return {
                "label": "FAKE" if is_fake else "REAL",
                "confidence": round(confidence, 2),
                "explanation": explanation,
                "sources": sources,
                "isFake": is_fake
            }
            
        except Exception as e:
            logger.error(f"Error in analyze method: {str(e)}", exc_info=True)
            return {
                "label": "ERROR",
                "confidence": 0.5,
                "explanation": "Unable to analyze content due to a technical error.",
                "sources": self.default_sources,
                "isFake": False
            }
    
    def _get_sources_for_topics(self, detected_topics: set) -> List[str]:
        """Get relevant fact-checking sources based on detected topics"""
        sources = self.default_sources.copy()
        
        # Add topic-specific sources
        for topic in detected_topics:
            # Find matching topic key (simplified approach)
            for topic_key in self.topic_sources:
                if topic_key in topic or topic in topic_key:
                    # Add first source from this topic
                    relevant_source = self.topic_sources[topic_key][0]
                    if relevant_source not in sources:
                        sources.append(relevant_source)
                        
        # Return up to 5 sources
        return sources[:5] 