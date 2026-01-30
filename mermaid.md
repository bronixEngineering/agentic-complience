graph TD
    %% Main Flow Start
    Start((Start)) --> UserInput[User Input: Raw Brief]
    UserInput --> EnhanceBrief[AI: Enhance Brief]
    
    %% Approval and Feedback Loop (Mandatory Gate)
    EnhanceBrief --> ApprovalCheck{Is Brief Suitable?}
    
    ApprovalCheck -- NO --> Suspend([Suspend: Get User Feedback])
    Suspend -.-> Resume([Resume: Feedback Received])
    Resume -->|Regenerate with feedback| EnhanceBrief
    
    ApprovalCheck -- YES --> FanOut{Fan-out Start}
    
    %% Parallel Persona Flows (Subgraph)
    subgraph FanOutFlows [Parallel Creative Production Flows]
        direction TB
        
        %% Performance Flow
        FanOut --> GenPerf[Generate Prompt:<br/>Performance]
        GenPerf --> ImgPerf[Generate Image:<br/>Performance]
        ImgPerf --> FinalAgg
        
        %% Art Director Flow
        FanOut --> GenArt[Generate Prompt:<br/>Art Director]
        GenArt --> ImgArt[Generate Image:<br/>Art Director]
        ImgArt --> FinalAgg
        
        %% Packshot Flow
        FanOut --> GenPack[Generate Prompt:<br/>Packshot]
        GenPack --> ImgPack[Generate Image:<br/>Packshot]
        ImgPack --> FinalAgg
        
        %% UGC Flow
        FanOut --> GenUGC[Generate Prompt:<br/>UGC]
        GenUGC --> ImgUGC[Generate Image:<br/>UGC]
        ImgUGC --> FinalAgg
        
        %% Minimal Luxury Flow
        FanOut --> GenLux[Generate Prompt:<br/>Minimal Luxury]
        GenLux --> ImgLux[Generate Image:<br/>Minimal Luxury]
        ImgLux --> FinalAgg
        
        %% Bold Trend Flow
        FanOut --> GenBold[Generate Prompt:<br/>Bold Trend]
        GenBold --> ImgBold[Generate Image:<br/>Bold Trend]
        ImgBold --> FinalAgg
    end
    
    %% Result Aggregation
    FinalAgg[Final Aggregate] --> Result([Result: Enhanced Brief, Prompts & Images])
    Result --> End((End))

    %% Style Definitions
    style Start fill:#f9f,stroke:#333,stroke-width:2px
    style Suspend fill:#ff9,stroke:#333,stroke-width:2px
    style Result fill:#9f9,stroke:#333,stroke-width:2px
    style EnhanceBrief fill:#bbf,stroke:#333,stroke-width:2px