# ffmpeg dependency (not pip install)
# pip install spleeter

from spleeter.separator import Separator
from spleeter.utils.logging import enable_verbose_logging
from sys import argv

enable_verbose_logging()
model = argv[1]
separator = Separator('spleeter:' + model)

filename = argv[2]
dir = argv[3]

separator.separate_to_file(filename, dir)
