import SwiftUI

struct ButtonStyle: ViewModifier {
    enum ButtonType {
        case primary
        case secondary
        case outline
        case danger
        case success
    }
    
    let type: ButtonType
    let isFullWidth: Bool
    var disabled: Bool = false
    
    func body(content: Content) -> some View {
        content
            .padding(.vertical, 12)
            .padding(.horizontal, 16)
            .frame(maxWidth: isFullWidth ? .infinity : nil)
            .background(backgroundColor)
            .foregroundColor(foregroundColor)
            .cornerRadius(10)
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(borderColor, lineWidth: type == .outline ? 2 : 0)
            )
            .opacity(disabled ? 0.6 : 1.0)
    }
    
    private var backgroundColor: Color {
        guard !disabled else { return .gray.opacity(0.3) }
        
        switch type {
        case .primary:
            return Color.blue
        case .secondary:
            return Color.gray.opacity(0.2)
        case .outline:
            return Color.clear
        case .danger:
            return Color.red
        case .success:
            return Color.green
        }
    }
    
    private var foregroundColor: Color {
        switch type {
        case .primary, .danger, .success:
            return .white
        case .secondary:
            return .primary
        case .outline:
            return type == .danger ? .red : .blue
        }
    }
    
    private var borderColor: Color {
        switch type {
        case .outline:
            return type == .danger ? .red : .blue
        default:
            return .clear
        }
    }
}

struct StyledButton: View {
    let title: String
    let type: ButtonStyle.ButtonType
    let isFullWidth: Bool
    let disabled: Bool
    let action: () -> Void
    
    init(
        title: String,
        type: ButtonStyle.ButtonType = .primary,
        isFullWidth: Bool = false,
        disabled: Bool = false,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.type = type
        self.isFullWidth = isFullWidth
        self.disabled = disabled
        self.action = action
    }
    
    var body: some View {
        Button(action: {
            if !disabled {
                action()
            }
        }) {
            Text(title)
                .fontWeight(.medium)
        }
        .modifier(ButtonStyle(type: type, isFullWidth: isFullWidth, disabled: disabled))
        .disabled(disabled)
    }
}

// EXAMPLES
#Preview {
    VStack(spacing: 20) {
        StyledButton(title: "Primary Button", type: .primary) {}
        StyledButton(title: "Secondary Button", type: .secondary) {}
        StyledButton(title: "Outline Button", type: .outline) {}
        StyledButton(title: "Danger Button", type: .danger) {}
        StyledButton(title: "Success Button", type: .success) {}
        StyledButton(title: "Full Width Button", isFullWidth: true) {}
        StyledButton(title: "Disabled Button", disabled: true) {}
    }
    .padding()
} 