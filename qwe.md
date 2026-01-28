We will receive this information from the user.
Prompt*: `example prompt here :
An action shot of a black lab swimming in an underground suburban swimming pool. The camera is placed meticulously on the water line, dividing the image in half, revealing both the dogs head above water holding a tennis ball in it's mouth, and it's paws paddling underwater. `

Aspect Ratio
Resolution


So we will get these 3 things from the user `Prompt, Aspect Ratio, Resolution`

Then we will create the image using nanobananapro in fal-ai.

I did these:
`bun add @fal-ai/client

# Nano Banana Pro

> Nano Banana Pro (a.k.a Nano Banana 2) is Google's new state-of-the-art image generation and editing model


## Overview

- **Endpoint**: `https://fal.run/fal-ai/nano-banana-pro`
- **Model ID**: `fal-ai/nano-banana-pro`
- **Category**: text-to-image
- **Kind**: inference
**Tags**: realism, typography



## API Information

This model can be used via our HTTP API or more conveniently via our client libraries.
See the input and output schema below, as well as the usage examples.


### Input Schema

The API accepts the following input parameters:


- **`prompt`** (`string`, _required_): 
The text prompt to generate an image from. 
- Examples: "An action shot of a black lab swimming in an inground suburban swimming pool. The camera is placed meticulously on the water line, dividing the image in half, revealing both the dogs head above water holding a tennis ball in it's mouth, and it's paws paddling underwater."


- **`aspect_ratio`** (`AspectRatioEnum`, _optional_): 
The aspect ratio of the generated image. Default value: `"1:1"` 
- Default: `"1:1"` 
- Options: `"21:9"`, `"16:9"`, `"3:2"`, `"4:3"`, `"5:4"`, `"1:1"`, `"4:5"`, `"3:4"`, `"2:3"`, `"9:16"`





**Required Parameters Example**:

```json
{ 
"prompt": "An action shot of a black lab swimming in an inground suburban swimming pool. The camera is placed meticulously on the water line, dividing the image in half, revealing both the dogs head above water holding a tennis ball in it's mouth, and it's paws paddling underwater."
}
```

**Full Example**:

```json
{ 
"prompt": "An action shot of a black lab swimming in an inground suburban swimming pool. The camera is placed meticulously on the water line, dividing the image in half, revealing both the dogs head above water holding a tennis ball in it's mouth, and it's paws paddling underwater.", 
"num_images": 1, 
"aspect_ratio": "1:1", 
}
```


### Output Schema

The API returns the following output format:

- **`images`** (`list<ImageFile>`, _required_): 
The generated images. 
- Array of ImageFile 
- Examples: [{"file_name":"nano-banana-t2i-output.png","content_type":"image/png","url":"https://storage.googleapis.com/falserverless/example_outputs/nano-banana-t2i-output.png"}]

- **`description`** (`string`, _required_): 
The description of the generated images.



**Example Response**:

```json
{ 
"images": [ 
{ 
"file_name": "nano-banana-t2i-output.png", 
"content_type": "image/png", 
"url": "https://storage.googleapis.com/falserverless/example_outputs/nano-banana-t2i-output.png" 
} 
], 
"description": ""
}
```


## Usage Examples

### cURL

```bash
curl --request POST\ 
--url https://fal.run/fal-ai/nano-banana-pro\ 
--header "Authorization: Key $FAL_KEY" \ 
--header "Content-Type: application/json" \ 
--data '{ 
"prompt": "An action shot of a black lab swimming in an inground suburban swimming pool. The camera is placed meticulously on the water line, dividing the image in half, revealing both the dogs head above water holding a tennis ball in it's mouth, and it's paws paddling underwater." 
}'
```

###Python

Ensure you have