from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json
root = Path(__file__).resolve().parent.parent
for product in ('nagi-feed',):
    for browser in ('chrome', 'firefox'):
        source = root / 'dist' / browser
        manifest = json.loads((source / 'manifest.json').read_text())
        output = root / 'dist' / f'{product}-{browser}-{manifest["version"]}.zip'
        with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
            for file in sorted(source.iterdir()):
                if file.is_file():
                    archive.write(file, file.name)
        with ZipFile(output) as archive:
            assert archive.testzip() is None
            assert json.loads(archive.read('manifest.json'))['name'] == manifest['name']
        print(output)
