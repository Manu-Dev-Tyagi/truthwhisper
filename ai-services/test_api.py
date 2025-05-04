#!/usr/bin/env python3
"""
Test script for the TruthWhisper AI service with Google Fact Check API integration
"""

import requests
import json
import sys
import os

def test_api(text, url="http://127.0.0.1:9999"):
    """
    Test the API with the given text
    """
    print(f"\n=== Testing API with text: {text[:50]}... ===\n")
    
    # Send a POST request to the API
    try:
        response = requests.post(
            f"{url}/analyze-text",
            json={"content": text},
            timeout=30
        )
        
        # Print the status code
        print(f"Status code: {response.status_code}")
        
        # If the request was successful, print the response
        if response.status_code == 200:
            result = response.json()
            
            # Print the result in a formatted way
            print("\n=== RESULT ===\n")
            if result['isFake'] is None:
                print(f"Status: UNKNOWN (No fact-checks found)")
            else:
                print(f"Is Fake: {result['isFake']}")
            
            if result['isFake'] is not None:
                print(f"Confidence: {result['confidence'] * 100:.1f}%")
            else:
                print("Confidence: Not applicable (no fact-checks found)")
            
            print(f"Explanation: {result['explanation']}")
            
            if result['sources']:
                print("\nSources:")
                for source in result['sources']:
                    print(f"- {source}")
            else:
                print("\nNo sources provided.")
                
            return result
        else:
            print(f"Error: {response.text}")
            return None
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

def main():
    """
    Main function to test the API
    """
    # Check if the API key is set
    if not os.environ.get("GOOGLE_FACT_CHECK_API_KEY"):
        print("WARNING: GOOGLE_FACT_CHECK_API_KEY environment variable is not set!")
        print("The API may not work correctly without an API key.")
        
    # Default test text
    test_texts = [
        "The Earth is flat",
        "COVID-19 vaccines contain microchips",
        "Joe Biden won the 2020 US presidential election",
        "Climate change is a hoax"
    ]
    
    # Get text from command line if provided
    if len(sys.argv) > 1:
        test_text = " ".join(sys.argv[1:])
        test_api(test_text)
    else:
        # Run tests with default texts
        print("=== Running tests with default claim texts ===")
        for text in test_texts:
            test_api(text)
            print("\n" + "-" * 50 + "\n")

if __name__ == "__main__":
    main() 