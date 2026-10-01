from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root=Path(__file__).resolve().parents[1]
files={'build/generic-phone-voyage-mod.json': 'build/generic-phone-voyage-mod.json', 'START-HERE.txt': 'START-HERE.txt', 'build/generic-phone-installer.html': 'build/generic-phone-installer.html', 'config/generic-phone.json': 'config/generic-phone.json', 'docs/downloads/Creator-Guide.pdf': 'Creator-Guide.pdf', 'LICENSE': 'LICENSE', 'THIRD_PARTY_NOTICES.md': 'THIRD_PARTY_NOTICES.md'}
output=root/"docs/downloads/textphone-for-voyage-0.7.0.zip"
with ZipFile(output,"w",ZIP_DEFLATED) as z:
    for source,target in files.items():z.write(root/source,root.name+"/"+target)
with ZipFile(output) as z:
    assert z.testzip() is None
    assert len(z.namelist())==7
print("Built seven-file creator package")
