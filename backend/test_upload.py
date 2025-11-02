"""
Test script to upload a file and see the JSON response.
Usage: python test_upload.py
"""
import requests
import json
import sys
from pathlib import Path

# Server URL
BASE_URL = "http://localhost:8000"
UPLOAD_URL = f"{BASE_URL}/upload"

def test_upload(file_path: str, claim_number: str = "test-claim-001"):
    """Upload a file and print the JSON response."""
    
    if not Path(file_path).exists():
        print(f"❌ Error: File not found: {file_path}")
        return
    
    print(f"\n📤 Uploading file: {file_path}")
    print(f"   Claim Number: {claim_number}")
    print(f"   URL: {UPLOAD_URL}\n")
    
    try:
        with open(file_path, 'rb') as f:
            files = {'file': (Path(file_path).name, f, 'application/pdf')}
            data = {'claim_number': claim_number}
            
            response = requests.post(UPLOAD_URL, files=files, data=data)
        
        print(f"Status Code: {response.status_code}\n")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Upload Successful!\n")
            print("=" * 60)
            print("JSON Response:")
            print("=" * 60)
            print(json.dumps(result, indent=2, ensure_ascii=False))
            print("=" * 60)
            
            # Pretty print the analysis section
            if 'analysis' in result:
                print("\n📊 Analysis Summary:")
                print(f"   Insurance Type: {result['analysis'].get('insurance_type', 'N/A')}")
                print(f"   Document Type: {result['analysis'].get('document_type', 'N/A')}")
                print(f"   Extraction Method: {result['analysis'].get('meta', {}).get('method', 'N/A')}")
                
                extraction = result['analysis'].get('extraction', {})
                if extraction:
                    print(f"\n   Extracted Fields ({len(extraction)}):")
                    for key, value in extraction.items():
                        print(f"      • {key}: {value}")
                
                validation = result['analysis'].get('validation', {})
                if validation:
                    status = validation.get('status', 'unknown')
                    print(f"\n   Validation Status: {status}")
                    if status == 'invalid':
                        print(f"      Error: {validation.get('error', 'N/A')}")
        else:
            print(f"❌ Upload Failed!")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to server.")
        print(f"   Make sure the server is running at {BASE_URL}")
        print("   Start server with: uvicorn main:app --reload")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Check for command line arguments
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        claim_number = sys.argv[2] if len(sys.argv) > 2 else f"test-{Path(file_path).stem}"
    else:
        # Default: try to find a PDF in the dataset
        dataset_paths = [
            Path("../ml/dataset/accident/accord_form_100"),
            Path("../ml/dataset/health/accord_form_100"),
        ]
        
        pdf_file = None
        for dataset_path in dataset_paths:
            if dataset_path.exists():
                pdf_files = list(dataset_path.glob("*.pdf"))
                if pdf_files:
                    pdf_file = pdf_files[0]
                    break
        
        if pdf_file:
            file_path = str(pdf_file)
            claim_number = f"test-{pdf_file.stem}"
            print(f"📁 Found PDF file: {file_path}")
        else:
            print("❌ No PDF file found!")
            print("\nUsage:")
            print("  python test_upload.py <file_path> [claim_number]")
            print("\nExample:")
            print("  python test_upload.py ../ml/dataset/accident/accord_form_100/sample.pdf CLM-001")
            sys.exit(1)
    
    test_upload(file_path, claim_number)

