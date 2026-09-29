#!/usr/bin/env python3
'''
This file dynamically generates the current list of tools, and updates the "data/tools.json" file accordingly. It is run automatically when the website is updated (hence why the json is in the gitignore)

'''
# There are a number of libraries which could make this a little easier, but I wrote it like this to make sure that anyone who pulls the project can run this no problem.

import os
import json

CONFIG_NAME = 'config.json'
OUTPUT_NAME = 'tools.json'
TOOLS_FOLDER = 'tools'
OUTPUT_FOLDER = 'data'

# ========================================================

ROOT_PATH = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir))
OUTPUT_PATH = os.path.join(ROOT_PATH, OUTPUT_FOLDER, OUTPUT_NAME)
TOOLS_PATH = os.path.join(ROOT_PATH, TOOLS_FOLDER)

def get_value_or_raise_error(d: dict, k: str, path: str):

    if k not in d:

        print(f'A required key was not found in the config.json for the given tool. Please check {CONFIG_NAME}, and run again')
        print(f'Tool path: {path}')
        print(f'Required key: {k}')
        print(f'Current data: {d}')

        raise ValueError(f'Key not found in config file.')
    
    return d[k]

def main():

    output_dict = {}

    num_created = 0

    # Enumerate over the tools
    for tool_path in os.listdir(TOOLS_PATH):

        # Check for this tools config.
        tool_abspath = os.path.join(TOOLS_PATH, tool_path)
        config_abspath = os.path.join(tool_abspath, CONFIG_NAME)

        if not os.path.exists(config_abspath):
            continue # Config does not exist. Likely misconfigured tool, or the boilerplate tool.

        with open(config_abspath, 'r') as config_file:
            config_data = json.load(config_file)

        name = get_value_or_raise_error(config_data, 'name', tool_abspath)
        tool_type = get_value_or_raise_error(config_data, 'type', tool_abspath)
        image = get_value_or_raise_error(config_data, 'image', tool_abspath)

        # Check that the image path is hosted in the tools main directory, and that it exists.
        # Might be an easier way to do this. Oh well!
 
        project_image_path = os.path.join(tool_abspath, os.path.basename(image))
        
        if not os.path.exists(project_image_path):
            raise ValueError(f'Image file specified in {CONFIG_NAME} does not exist for tool: {tool_abspath}')

        if tool_type not in output_dict:
            output_dict[tool_type] = []

        output_dict[tool_type].append({
            'name': name,
            'image': os.path.basename(image),
            'path': os.path.join(TOOLS_FOLDER, tool_path)
        })

        num_created += 1

    print(f'{num_created} Tool configs loaded.')

    if not os.path.exists(os.path.join(ROOT_PATH, OUTPUT_FOLDER)):
        os.mkdir(os.path.join(ROOT_PATH, OUTPUT_FOLDER)) # Using mkdir here instead of makedirs, since we should only need to make one. Therefore this is safer.

    # Write the output.
    with open(OUTPUT_PATH, 'w') as output_json:
        json.dump(output_dict, output_json)

    print("Done.")

if __name__ == '__main__':
    main()